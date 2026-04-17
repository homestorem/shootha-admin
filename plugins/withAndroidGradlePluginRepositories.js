const { withSettingsGradle, createRunOncePlugin } = require("@expo/config-plugins");

/** JetBrains proxy for Maven Central — avoids HTTP 429 from repo.maven.apache.org on shared CI (e.g. EAS). */
const JB_MAVEN_CENTRAL = "https://cache-redirector.jetbrains.com/maven-central";

/**
 * EAS/Android Gradle often resolves kotlin-gradle-plugin via Maven Central and gets 429.
 * pluginManagement.repositories: try Google + Plugin Portal + JetBrains mirror before raw mavenCentral().
 */
function withAndroidGradlePluginRepositories(config) {
  return withSettingsGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      return config;
    }
    let contents = config.modResults.contents;
    if (contents.includes(JB_MAVEN_CENTRAL)) {
      return config;
    }

    const legacyBlock =
      /  \/\/ expo-gradle-plugin-repos\n  repositories \{\n    google\(\)\n    gradlePluginPortal\(\)\n    mavenCentral\(\)\n  \}\n\n/;
    if (legacyBlock.test(contents)) {
      contents = contents.replace(
        legacyBlock,
        `  // expo-gradle-plugin-repos
  repositories {
    google()
    gradlePluginPortal()
    maven { url '${JB_MAVEN_CENTRAL}' }
    mavenCentral()
  }

`
      );
      config.modResults.contents = contents;
      return config;
    }

    contents = contents.replace(
      /^pluginManagement \{\n/m,
      `pluginManagement {
  // expo-gradle-plugin-repos
  repositories {
    google()
    gradlePluginPortal()
    maven { url '${JB_MAVEN_CENTRAL}' }
    mavenCentral()
  }

`
    );
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withAndroidGradlePluginRepositories,
  "with-android-gradle-plugin-repositories",
  "1.1.0"
);
