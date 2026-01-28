document.addEventListener("DOMContentLoaded", function() {

    const playForm = document.getElementById("play-form");
    const urlInput = document.getElementById("url");
    const apiSelect = document.getElementById("jk");
    const playerIframe = document.getElementById("player");

    if (playForm) {
        playForm.addEventListener("submit", function(event) {
            // 阻止表单的默认提交行为
            event.preventDefault();
            parseVideo();
        });
    }

    // --- 自动更新页脚年份 ---
    const currentYearSpan = document.getElementById("current-year");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    /**
     * 解析并播放视频
     */
    function parseVideo() {
        const videoUrl = urlInput.value.trim();
        const apiUrl = apiSelect.value;

        if (!videoUrl) {
            playerIframe.src = apiUrl + videoUrl; // videoUrl 在这里是 ""
            return; // 完成操作，不再向下执行
        }

        try {
            const parsedUrl = new URL(videoUrl);
            
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                throw new Error("Invalid protocol");
            }
            playerIframe.src = apiUrl + videoUrl;

        } catch (e) {
            alert("您输入的URL格式不正确，请输入一个有效的 http 或 https 链接。");
            return;
        }
    }

});