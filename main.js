document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header");
  const heroSection = document.querySelector("#home");
  const homeLink = document.querySelector('a[href="#home"]');

  let heroHidden = false;

  // Initial State: Show hero, hide navbar
  header.classList.remove("visible");
  heroSection.classList.remove("hidden-hero");

  // SCROLL behavior — hide hero only ONCE, show navbar
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50 && !heroHidden) {
      heroSection.classList.add("hidden-hero");
      header.classList.add("visible");
      heroHidden = true;
    }
  });

  // HOME click — restore hero, hide navbar
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      heroSection.classList.remove("hidden-hero");
      header.classList.remove("visible");
      heroHidden = false;
    }, 500);
  });
});
