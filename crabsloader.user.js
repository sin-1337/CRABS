// ==UserScript==
// @name CRABS
// @namespace https://www.bondageprojects.com/
// @version 0.0.2.10
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


(function() {
    'use strict';

    // Function to inject the GitHub script with a dynamic timestamp query parameter
    function injectCRABS() {
        // Remove the existing script if it's already injected
        var existingScript = document.getElementById("CRABS");
        if (existingScript) {
            existingScript.remove();
        }

        // Create the CRABS script element
        var script = document.createElement("script");
        script.id = "CRABS";  // Set a unique ID to track the script
        script.language = "JavaScript";
        script.setAttribute("crossorigin", "anonymous");

        //  CRABES URL, with a timestamp to prevent caching
        script.src = `https://sin-1337.github.io/CRABS/Alpha/bundle.js?${Date.now()}`;

        // Append the script to the document's head
        document.head.appendChild(script);
        console.log("Injected the GitHub script with a timestamp:", script.src);
    }

    // Inject CRABS for the first time
    injectCRABS();

    // Reload CRABS every 24 hours
    setInterval(function() {
        injectCRABS(); // Reload the GitHub script
    }, 86400000);  // Adjust the interval as needed (10000 ms = 10 seconds)


})();

CommandCombine([{
    Tag: 'crabsreload',
    Description: "Dynamically updates the CRABS backend.",
    Action: args => {
        injectCRABS();
    }
}]);


