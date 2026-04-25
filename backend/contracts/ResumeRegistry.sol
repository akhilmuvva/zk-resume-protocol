// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IResumeVerifier.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// ResumeRegistry.sol
// Akhil Muvva
// handles on-chain verification for ZK-SNARKs + EAS.
// logic: university signs -> student proves -> contract verifies.
contract ResumeRegistry is ReentrancyGuard, AccessControl {
    using ECDSA for bytes32;

    // roles
    bytes32 public constant UNIVERSITY_MANAGER_ROLE = keccak256("UNIVERSITY_MANAGER_ROLE");

    // state

    IResumeVerifier public immutable verifier;
    
    // EAS contract on Sepolia
    address public constant EAS_SEPOLIA = 0xC2679fBD37d54388Ce493F1DB75320D236e1815e;

    mapping(address => string) public registeredUniversities;
    mapping(address => VerificationRecord) public verifications;
    address[] public verifiedHoldersList;
    mapping(bytes32 => bool) public usedAttestations; // replay protection
    mapping(address => mapping(address => ATSVerdict)) public employerVerdicts;

    struct VerificationRecord {
        bool isVerified;
        uint256 threshold;          
        uint256 verifiedAt;         
        bytes32 attestationUID;     
        address universityAddress;  
        uint256 blockNumber;
    }

    struct ATSVerdict {
        bool qualified;
        uint256 score;
        uint256 timestamp;
        string ipfsCID;
    }

    // events

    event CredentialVerified(
        address indexed holder,
        address indexed university,
        uint256 indexed threshold,
        bytes32 attestationUID,
        uint256 blockNumber
    );

    event UniversityRegistered(address indexed universityAddress, string name);
    event VerificationFailed(address indexed holder, string reason);

    event ATSVerdictRecorded(
        address indexed employer,
        address indexed candidate,
        bool    indexed qualified,
        uint256 score,
        string  ipfsCID
    );

    // errors

    error InvalidProof();
    error AttestationAlreadyUsed();
    error UniversityNotRegistered(address signer);
    error InvalidSignature();
    error ZeroAddress();
    error CandidateNotVerified(address candidate);

    constructor(address _verifier) {
        if (_verifier == address(0)) revert ZeroAddress();
        verifier = IResumeVerifier(_verifier);
        
        // grant deployer initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNIVERSITY_MANAGER_ROLE, msg.sender);
    }

    // verify a proof + sig in one call
    function verifyCredential(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals,
        bytes32 _attestationUID,
        bytes calldata _easSignature
    ) external nonReentrant returns (bool) {

        // 1. Replay check
        if (usedAttestations[_attestationUID]) {
            revert AttestationAlreadyUsed();
        }

        // 2. Recover signer from the EAS signature
        // The university signs (attestationUID, threshold, studentIdHash)
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                _attestationUID,
                _pubSignals[1],   // threshold
                _pubSignals[2]    // studentIdHash
            )
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address signer = ethSignedHash.recover(_easSignature);
        if (signer == address(0)) revert InvalidSignature();

        // 3. Auth check for university
        if (bytes(registeredUniversities[signer]).length == 0) {
            emit VerificationFailed(msg.sender, "University not registered");
            revert UniversityNotRegistered(signer);
        }

        // 4. Verification call to Groth16 contract
        bool proofValid = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        if (!proofValid || _pubSignals[0] != 1) {
            emit VerificationFailed(msg.sender, "Invalid ZK proof or unqualified");
            revert InvalidProof();
        }

        // 5. Commit state
        usedAttestations[_attestationUID] = true;
        bool isFirst = !verifications[msg.sender].isVerified;

        verifications[msg.sender] = VerificationRecord({
            isVerified:       true,
            threshold:        _pubSignals[1],
            verifiedAt:       block.timestamp,
            attestationUID:   _attestationUID,
            universityAddress: signer,
            blockNumber:      block.number
        });

        if (isFirst) {
            verifiedHoldersList.push(msg.sender);
        }

        emit CredentialVerified({
            holder:         msg.sender,
            university:     signer,
            threshold:      _pubSignals[1],
            attestationUID: _attestationUID,
            blockNumber:    block.number
        });

        return true;
    }

    // helpers

    function checkQualification(
        address holder,
        uint256 minThreshold
    ) external view returns (bool qualified, VerificationRecord memory record) {
        record = verifications[holder];
        qualified = record.isVerified && record.threshold >= minThreshold;
    }

    function getAllVerifiedHolders() external view returns (address[] memory) {
        return verifiedHoldersList;
    }

    // Paginated list to avoid gas issues
    function getVerifiedHoldersPaged(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory page, uint256 total) {
        total = verifiedHoldersList.length;
        if (offset >= total) return (new address[](0), total);
        
        uint256 end = offset + limit > total ? total : offset + limit;
        page = new address[](end - offset);
        
        for (uint256 i = offset; i < end; ++i) {
            page[i - offset] = verifiedHoldersList[i];
        }
    }

    function totalVerifications() external view returns (uint256) {
        return verifiedHoldersList.length;
    }

    // employer logic

    function recordATSVerdict(
        address candidate,
        bool qualified,
        uint256 score,
        string calldata ipfsCID
    ) external {
        if (candidate == address(0)) revert ZeroAddress();
        if (!verifications[candidate].isVerified) revert CandidateNotVerified(candidate);

        employerVerdicts[msg.sender][candidate] = ATSVerdict({
            qualified: qualified,
            score:     score,
            timestamp: block.timestamp,
            ipfsCID:   ipfsCID
        });

        emit ATSVerdictRecorded({
            employer:   msg.sender,
            candidate:  candidate,
            qualified:  qualified,
            score:      score,
            ipfsCID:    ipfsCID
        });
    }

    // admin

    /**
     * @dev Registers a university to sign credentials.
     * Compatible with Multisig/DAO: Grant UNIVERSITY_MANAGER_ROLE to the multisig.
     */
    function registerUniversity(
        address universityAddress,
        string calldata name
    ) external onlyRole(UNIVERSITY_MANAGER_ROLE) {
        if (universityAddress == address(0)) revert ZeroAddress();
        registeredUniversities[universityAddress] = name;
        emit UniversityRegistered(universityAddress, name);
    }
}
