document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.querySelector('.pc-card-wrapper');
    if (!wrapper) return;
  
    wrapper.addEventListener('mousemove', e => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = (x - centerX) / centerX;
      const offsetY = (y - centerY) / centerY;
  
      wrapper.style.setProperty('--pointer-x', `${x}px`);
      wrapper.style.setProperty('--pointer-y', `${y}px`);
      wrapper.style.setProperty('--pointer-from-center', Math.sqrt(offsetX ** 2 + offsetY ** 2).toFixed(2));
      wrapper.style.setProperty('--pointer-from-left', (x / rect.width).toFixed(2));
      wrapper.style.setProperty('--pointer-from-top', (y / rect.height).toFixed(2));
      wrapper.style.setProperty('--rotate-x', `${offsetX * 10}deg`);
      wrapper.style.setProperty('--rotate-y', `${-offsetY * 10}deg`);
      wrapper.style.setProperty('--background-x', `${(x / rect.width) * 100}%`);
      wrapper.style.setProperty('--background-y', `${(y / rect.height) * 100}%`);
    });
  
    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.setProperty('--rotate-x', '0deg');
      wrapper.style.setProperty('--rotate-y', '0deg');
    });
  });
  