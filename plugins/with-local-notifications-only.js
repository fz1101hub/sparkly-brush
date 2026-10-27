const { withEntitlementsPlist } = require("expo/config-plugins");

// expo-notifications always adds the push entitlement, which needs a push-enabled App ID and
// tells App Review the app receives remote notifications. Reminders here are local only, so the
// entitlement is removed. List this plugin before "expo-notifications": mods added earlier run later.
function removePushEntitlement(entitlements) {
  delete entitlements["aps-environment"];
  return entitlements;
}

function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    modConfig.modResults = removePushEntitlement(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withLocalNotificationsOnly;
module.exports.removePushEntitlement = removePushEntitlement;
