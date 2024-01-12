const Site = (function () {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let isInit = false;

    const loading = function loading(show) {
        const loader = document.getElementById("loader");
        const loadingOverlay = document.getElementById("loadingOverlay");
        if (show) {
            loadingOverlay.classList.remove("hidden");
            loader.classList.remove("hidden");
        } else {
            loadingOverlay.classList.add("hidden");
            loader.classList.add("hidden");
        }
    };


    const showError = function showError(message) {
        const success = document.getElementById("success");
        if (!success.classList.contains("hidden")) {
            display(true, success);
        }
        const error = document.getElementById("error");
        document.getElementById("errorContent").textContent = message.trim();
        display(false, error);
    };

    const showSuccess = function showSuccess() {
        const error = document.getElementById("error");
        const success = document.getElementById("success");
        display(true, error);
        if (success.classList.contains("hidden")) {
            display(false, success);
        }
    };

    const display = function display(hide, element) {
        if (hide) {
            element.closest("div").classList.add("hidden");
        } else {
            element.closest("div").classList.remove("hidden");
        }
    };

    const loadPage = function loadPage(anon) {
        // eslint-disable-next-line require-await
        anon.call(this, Site).then(async () => {
            function initTooltips() {
                document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
            }

            initTooltips();
            isInit = true;
        });
    };
    return {
        loadPage,
        loading,
        display,
        showSuccess,
        showError
    };
}());
