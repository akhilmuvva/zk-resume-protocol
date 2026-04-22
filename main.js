// Navigation Logic
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if (link.id === `nav-${sectionId}`) {
            link.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);
}

// Wallet Connection Simulation
const connectBtn = document.getElementById('connect-btn');
const walletModal = document.getElementById('wallet-modal');

connectBtn.addEventListener('click', () => {
    walletModal.style.display = 'flex';
});

function closeModal() {
    walletModal.style.display = 'none';
}

function connectWallet(provider) {
    showToast(`Connecting to ${provider}...`);
    setTimeout(() => {
        connectBtn.innerHTML = `
            <span style="color: var(--secondary)">●</span> 0x83B...4F9E
        `;
        closeModal();
        showToast('Wallet Connected Successfully!', 'success');
    }, 1500);
}

// Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast glass';
    if (type === 'success') toast.style.borderLeftColor = 'var(--success)';
    if (type === 'error') toast.style.borderLeftColor = 'var(--error)';
    
    toast.innerHTML = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Issue Form Logic
const issueForm = document.getElementById('issue-form');
const issueOutput = document.getElementById('issue-output');
const attestationJson = document.getElementById('attestation-json');

if (issueForm) {
    issueForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Signing Attestation...', 'info');
        
        const data = {
            studentID: "0x72a56193...c9f1",
            degree: "B.S. Computer Science",
            cgpa: 9.5,
            year: 2024,
            issuer: "0xUniAddress...",
            signature: "0x7d2...f3a1"
        };
        
        setTimeout(() => {
            issueOutput.style.display = 'block';
            attestationJson.innerText = JSON.stringify(data, null, 2);
            showToast('Attestation Generated & Signed!', 'success');
        }, 2000);
    });
}

// Proof Generation Simulation
function generateProof(btn) {
    const card = btn.closest('.credential-card');
    const progress = card.querySelector('.progress-container');
    const downloads = card.querySelector('.proof-downloads');
    const steps = progress.querySelectorAll('.step');
    
    btn.disabled = true;
    btn.innerText = "Generating...";
    progress.style.display = 'block';
    
    let currentStep = 0;
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        } else {
            clearInterval(interval);
            btn.style.display = 'none';
            downloads.style.display = 'flex';
            showToast('Zero-Knowledge Proof Generated!', 'success');
        }
    }, 1200);
}

// Verifier Logic
const cgpaSlider = document.getElementById('cgpa-slider');
const cgpaVal = document.getElementById('cgpa-val');
const verifyBtn = document.getElementById('verify-btn');
const successCard = document.getElementById('verify-success');
const failCard = document.getElementById('verify-fail');

if (cgpaSlider) {
    cgpaSlider.addEventListener('input', (e) => {
        cgpaVal.innerText = e.target.value;
    });
}

if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
        successCard.style.display = 'none';
        failCard.style.display = 'none';
        verifyBtn.disabled = true;
        verifyBtn.innerText = "Verifying On-chain...";
        
        showToast('Calling Smart Contract...', 'info');
        
        setTimeout(() => {
            const threshold = parseFloat(cgpaSlider.value);
            verifyBtn.disabled = false;
            verifyBtn.innerText = "Verify On-chain";
            
            // Simulation: Candidate (9.5) vs Threshold
            if (9.5 >= threshold) {
                successCard.style.display = 'block';
                showToast('Verification Successful!', 'success');
            } else {
                failCard.style.display = 'block';
                showToast('Verification Failed: Threshold not met', 'error');
            }
        }, 2500);
    });
}

// Initialize Hero
window.onload = () => {
    showSection('hero');
};
