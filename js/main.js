(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // ---------- Loader ----------
  const loader = document.getElementById("loader");
  const hideLoader = () => setTimeout(() => loader.classList.add("hidden"), 600);
  if (document.readyState === "complete") hideLoader();
  else window.addEventListener("load", hideLoader);

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- Typed roles ----------
  const roles = ["Full-Stack Developer", "Frontend Developer", "UI/UX Designer", "Web App Builder"];
  const typed = document.getElementById("typed");
  let roleIdx = 0, charIdx = 0, deleting = false;
  const type = () => {
    const word = roles[roleIdx];
    typed.textContent = word.slice(0, charIdx);
    if (!deleting && charIdx < word.length) charIdx++;
    else if (deleting && charIdx > 0) charIdx--;
    else if (!deleting) { deleting = true; return setTimeout(type, 1600); }
    else { deleting = false; roleIdx = (roleIdx + 1) % roles.length; }
    setTimeout(type, deleting ? 45 : 90);
  };
  if (reduceMotion) typed.textContent = roles[0];
  else type();

  // ---------- Nav ----------
  const nav = document.getElementById("nav");
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  menuBtn.addEventListener("click", () => {
    menuBtn.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      menuBtn.classList.remove("open");
      navLinks.classList.remove("open");
    })
  );
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Active link highlight
  const sections = document.querySelectorAll("main section[id]");
  const linkFor = (id) => navLinks.querySelector(`a[href="#${id}"]`);
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = linkFor(entry.target.id);
        if (link && entry.isIntersecting) {
          navLinks.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
          link.classList.add("active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  // ---------- Reveal on scroll ----------
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // stagger siblings in the same grid
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
        el.style.transitionDelay = `${Math.max(0, siblings.indexOf(el)) * 90}ms`;
        el.classList.add("visible");
        revealObserver.unobserve(el);
        if (el.querySelector("[data-count]")) runCounters(el);
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  // ---------- Counters ----------
  function runCounters(scope) {
    scope.querySelectorAll("[data-count]").forEach((el) => {
      const end = +el.dataset.count;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 1400, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- 3D tilt cards ----------
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.transitionDelay = "0ms";
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 14}deg) translateZ(10px)`;
        card.style.setProperty("--gx", `${x * 100}%`);
        card.style.setProperty("--gy", `${y * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  // ---------- Cursor glow ----------
  const glow = document.getElementById("cursorGlow");
  if (finePointer) {
    window.addEventListener("pointermove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    });
  }

  // ---------- Contact form (opens mail client) ----------
  document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const subject = encodeURIComponent(`Portfolio enquiry from ${data.get("name")}`);
    const body = encodeURIComponent(`${data.get("message")}\n\n— ${data.get("name")} (${data.get("email")})`);
    window.location.href = `mailto:althaf.official9824@gmail.com?subject=${subject}&body=${body}`;
  });
})();
