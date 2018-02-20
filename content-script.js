function injectScript(file, node) {
    var th = document.getElementsByTagName(node)[0];
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', file);
    th.appendChild(s);
}
injectScript(chrome.extension.getURL('jquery.js'), 'head');
injectScript(chrome.extension.getURL('d3.v3.min.js'), 'head');
injectScript(chrome.extension.getURL('cola.v3.min.js'), 'head');
injectScript(chrome.extension.getURL('graph.js'), 'head');
injectScript(chrome.extension.getURL('neataptic.js'), 'head');
setTimeout(function() {
	injectScript(chrome.extension.getURL('bot.js'), 'head');
}, 1000);

function injectStyle(file, node) {
    var th = document.getElementsByTagName(node)[0];
    var s = document.createElement('link');
    s.setAttribute('rel', 'stylesheet');
    s.setAttribute('type', 'text/css');
    s.setAttribute('href', file);
    th.appendChild(s);
}
injectStyle(chrome.extension.getURL('graph.css'), 'head');