module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts", "**/*.test.js"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["src/**/*.{ts,js}", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 10000,
};
