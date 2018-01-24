function injectScript(file, node) {
    var th = document.getElementsByTagName(node)[0];
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', file);
    th.appendChild(s);
}
injectScript(chrome.extension.getURL('jquery.js'), 'head');
setTimeout(function() {
	injectScript(chrome.extension.getURL('bot.js'), 'head');
}, 1000);