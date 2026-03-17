// ==UserScript==
// @name CRABS
// @namespace https://www.bondageprojects.com/
// @version 1.3.2.11
// @description Adds /players, shows info about players in the room, also adds /whisper+
// @author Sin
// @match https://bondageprojects.elementfx.com/*
// @match https://www.bondageprojects.elementfx.com/*
// @match https://bondage-europe.com/*
// @match https://www.bondage-europe.com/*
// @match https://www.bondageprojects.com/*
// @match http://localhost:*/*
// @icon https://sin-1337.github.io/CRABS/CRABS_Logo.png
// @grant none
// @run-at document-end
// ==/UserScript==




(function () {
	'use strict';
	var script = document.createElement("script");
	script.langauge = "JavaScript";
	script.setAttribute("crossorigin", "anonymous");
	script.src = `https://cdn.jsdelivr.net/gh/sin-1337/CRABS@Alpha/Live/CRABS/Alpha/bundle.js?${Date.now()}`;
	document.head.appendChild(script);
})();
