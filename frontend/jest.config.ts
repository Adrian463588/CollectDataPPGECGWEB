import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Relax strict mode for tests; use project tsconfig otherwise
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    // Resolve @/ path alias
    "^@/(.*)$": "<rootDir>/src/$1",
    // Stub out CSS/assets
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/fileMock.js",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  roots: ["<rootDir>/__tests__"],
};

export default config;
