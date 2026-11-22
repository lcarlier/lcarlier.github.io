document.querySelectorAll(".prose div.highlight, .prose pre").forEach((block) => {
    if (block.tagName === "PRE" && block.closest("div.highlight")) {
        return;
    }

    const code = block.querySelector(".rouge-code pre") || block.querySelector("code") || block;
    const wrapper = document.createElement("div");
    const toolbar = document.createElement("div");
    const button = document.createElement("button");
    const status = document.createElement("span");
    const filename = block.dataset.filename ||
        (block.parentElement.matches(".highlighter-rouge") && block.parentElement.dataset.filename);
    let resetTimer;

    wrapper.className = "code-block";
    toolbar.className = "code-block__toolbar";
    button.className = "code-block__copy";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code to clipboard");
    status.className = "code-block__status";
    status.setAttribute("role", "status");

    if (filename) {
        const label = document.createElement("span");
        label.className = "code-block__filename";
        label.textContent = filename;
        toolbar.append(label);
    }

    button.addEventListener("click", async () => {
        clearTimeout(resetTimer);
        button.disabled = true;
        try {
            if (!navigator.clipboard || !window.isSecureContext) {
                throw new Error("Clipboard access is unavailable.");
            }
            await navigator.clipboard.writeText(code.textContent);
            button.textContent = "Copied";
            status.textContent = "Code copied to clipboard.";
        } catch (error) {
            console.error("Could not copy code to clipboard:", error);
            button.textContent = "Copy failed";
            status.textContent = "Could not copy. Please select the code and copy it manually.";
        } finally {
            button.disabled = false;
        }

        resetTimer = setTimeout(() => {
            button.textContent = "Copy";
            status.textContent = "";
        }, 4000);
    });

    block.before(wrapper);
    wrapper.append(toolbar, block);
    toolbar.append(status, button);
});
