/* ====================================================
   WARZONE EXODUS — ENTRY POINT
   Boots the game after DOM is ready
   ==================================================== */

(function () {
    'use strict';

    // Wait for all scripts to load
    window.addEventListener('DOMContentLoaded', async () => {
        console.log('%c⚡ WARZONE EXODUS v1.0', 'color:#00d4ff;font-size:18px;font-weight:bold');
        console.log('%cInitializing game systems...', 'color:#888');

        // Load save data first
        SaveManager.load();

        try {
            const game = new Game();
            await game.init();
            console.log('%c✅ Game initialized!', 'color:#00ff88;font-size:14px');
        } catch (err) {
            console.error('❌ Game initialization failed:', err);

            // Friendly error display
            const loadEl = document.getElementById('loading-screen');
            const loadText = document.getElementById('loading-status');
            if (loadEl && loadText) {
                loadEl.classList.remove('hidden');
                loadText.textContent = `Error: ${err.message}. Check console.`;
                loadText.style.color = '#ff4444';
            }
        }
    });
})();
