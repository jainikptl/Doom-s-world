document.querySelectorAll(".pc-card-wrapper").forEach((wrapper) => {
  const card = wrapper.querySelector(".pc-card");

  wrapper.addEventListener("pointerenter", () => {
    wrapper.classList.add("active");
    card.classList.add("active");
  });

  wrapper.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const width = card.offsetWidth;
    const height = card.offsetHeight;

    const percentX = (offsetX / width) * 100;
    const percentY = (offsetY / height) * 100;

    const centerX = percentX - 50;
    const centerY = percentY - 50;

    wrapper.style.setProperty("--pointer-x", `${percentX}%`);
    wrapper.style.setProperty("--pointer-y", `${percentY}%`);
    wrapper.style.setProperty("--rotate-x", `${-(centerX / 5)}deg`);
    wrapper.style.setProperty("--rotate-y", `${centerY / 4}deg`);
    wrapper.style.setProperty("--pointer-from-left", percentX / 100);
    wrapper.style.setProperty("--pointer-from-top", percentY / 100);

    const fromCenter = Math.hypot(centerX, centerY) / 50;
    wrapper.style.setProperty("--pointer-from-center", Math.min(fromCenter, 1));
  });

  wrapper.addEventListener("pointerleave", () => {
    wrapper.classList.remove("active");
    card.classList.remove("active");

    // Reset transform properties for smooth exit
    wrapper.style.setProperty("--rotate-x", `0deg`);
    wrapper.style.setProperty("--rotate-y", `0deg`);
    wrapper.style.setProperty("--pointer-from-center", 0);
    wrapper.style.setProperty("--pointer-x", `50%`);
    wrapper.style.setProperty("--pointer-y", `50%`);
    wrapper.style.setProperty("--pointer-from-left", 0.5);
    wrapper.style.setProperty("--pointer-from-top", 0.5);
  });
});
