// import section
import bcModSDK from 'bondage-club-mod-sdk';
//
//
//
//
//
// //////////////
//
//
//



function initCrabs() {
  if (!window.bcModSdk) {
    setTimeout(initCrabs, 500);
    return;
  }

  const crabs = bcModSDK.registerMod({
    name: "CRABS",
    fullName: "Crazy Roster Add-on By Sin",
    version: "1.0.0",
    repository: "https://github.com/sin-1337/CRABS"
  });
}
