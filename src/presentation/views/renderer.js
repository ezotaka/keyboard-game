// Renderer process for Keyboard Game
// Phase 1: Basic functionality demonstration

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Keyboard Game - Phase 1 initialized');
    
    // Add interactive elements for demonstration
    addSystemInfo();
    addClickEffects();
});

function addSystemInfo() {
    // Display system information
    const systemInfo = {
        electron: process.versions.electron,
        node: process.versions.node,
        chrome: process.versions.chrome,
        platform: process.platform
    };
    
    console.log('System Info:', systemInfo);
    
    // Add system info to the page (development only)
    if (process.env.NODE_ENV === 'development') {
        const footer = document.querySelector('footer p');
        if (footer) {
            footer.innerHTML += `<br><small>Electron ${systemInfo.electron} | Node ${systemInfo.node} | ${systemInfo.platform}</small>`;
        }
    }
}

function addClickEffects() {
    // Add click effects to task items
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        item.addEventListener('click', () => {
            item.style.transform = 'scale(0.98)';
            setTimeout(() => {
                item.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // Add hover effects
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.addEventListener('mouseenter', () => {
            section.style.transform = 'translateY(-2px)';
        });
        
        section.addEventListener('mouseleave', () => {
            section.style.transform = 'translateY(0)';
        });
    });
}