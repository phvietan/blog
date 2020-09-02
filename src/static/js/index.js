const burger = document.getElementById("navbar-burger");
burger.addEventListener("click", () => {
    document.querySelector('.navbar-menu').classList.toggle('is-active');
});