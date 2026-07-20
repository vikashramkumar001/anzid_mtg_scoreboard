// unleashed-motion.js — replay hook for the shared UNLEASHED entrance
// animations (see unleashed-motion.css). Pages include this once; animations
// themselves are pure CSS and run on element insertion.
//
// window.unlReplay() — restart every entrance animation from frame 0. For the
// console today; the future OBS stinger hook (obs-animate-<scene>) calls the
// same function so entrances can be re-triggered on scene switch.
(function () {
    const SEL = '.unl-fade, .unl-fade-rise, .unl-rise-lg, .unl-slide-left, ' +
                '.unl-slide-right, .unl-scale-in, .unl-pop';
    window.unlReplay = function () {
        document.querySelectorAll('.unl-still').forEach(el => el.classList.remove('unl-still'));
        const els = document.querySelectorAll(SEL);
        els.forEach(el => { el.style.animation = 'none'; });
        void document.body.offsetWidth;                    // force reflow between none -> ''
        els.forEach(el => { el.style.animation = ''; });
        return els.length + ' elements replayed';
    };
})();
