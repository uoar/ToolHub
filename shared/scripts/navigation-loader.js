/**
 * 导航栏加载器 - 简化版
 * 不使用 .global-nav__link，直接用 a 标签让 CSS 更简单
 */
(function() {
    const currentPath = window.location.pathname;
    // 检测是否在根目录（ToolHub文件夹下的 index.html）
    const isRootPage = currentPath.endsWith('/ToolHub/') || 
                       currentPath.endsWith('/ToolHub/index.html') || 
                       currentPath.endsWith('ToolHub\\index.html') ||
                       currentPath.endsWith('/index.html') && !currentPath.includes('/picker-wheel/') && !currentPath.includes('/json-parser/') && !currentPath.includes('/settings/');
    const pathPrefix = isRootPage ? '' : '../';
    
    const navigationHTML = `
<nav class="global-nav">
    <div class="global-nav__content">
        <ul class="global-nav__list global-nav__list--left">
            <li><a href="${pathPrefix}index.html" data-page="home">Home</a></li>
            <li><a href="${pathPrefix}picker-wheel/index.html" data-page="picker-wheel">Picker Wheel</a></li>
            <li><a href="${pathPrefix}json-parser/index.html" data-page="json-parser">JSON Parser</a></li>
        </ul>
        <div class="global-nav__list global-nav__list--right">
            <a href="${pathPrefix}settings/index.html" data-page="settings">Settings</a>
        </div>
    </div>
</nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', navigationHTML);

    const currentPage = document.body.getAttribute('data-page');
    if (currentPage) {
        document.querySelectorAll('.global-nav__content a[data-page]').forEach(item => {
            if (item.getAttribute('data-page') === currentPage) {
                item.classList.add('active');
            }
        });
    }
})();
