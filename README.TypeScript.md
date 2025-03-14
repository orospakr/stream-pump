# Stream Pump - TypeScript Version

This is the TypeScript version of Stream Pump, an HTTP live video stream reflector written in Node.js.

## Setup

1. Install dependencies:
   ```
   yarn install
   ```

2. Build the TypeScript code:
   ```
   yarn build
   ```

3. Run the server:
   ```
   yarn start <config file>
   ```

   Or for development:
   ```
   yarn dev <config file>
   ```

## Configuration

Create a configuration file based on the example in `src/config.ts.example`. You can use JavaScript or TypeScript for your configuration file.

Example TypeScript configuration:
```typescript
import { Config } from './lib/types';

export const config: Config = {
    port: 8086,
    // ... other configuration options
    streams: [
        {
            name: "Test Pull Video Source",
            enabled: false,
            type: "mmsh_pull",
            source_options: {host:"127.0.0.1", port: "7070", path: "/"},
            path: "pulled_video"
        },
        {
            name: "Test Push Video Source",
            enabled: true,
            type: "mmsh_push",
            path: "pushed_video"
        }
    ]
};
```

## Migration Notes

This is a TypeScript migration of the original Stream Pump project. The following changes were made:

1. Converted all JavaScript files to TypeScript
2. Added type definitions for configuration and data structures
3. Organized code into a src directory with compiled output in dist
4. Updated package.json scripts for TypeScript compilation
5. Simplified some complex modules to make them TypeScript-compatible

## Project Structure

- `src/`: TypeScript source files
  - `lib/`: Library modules
  - `config.ts`: Sample configuration file
  - `stream-pump.ts`: Main entry point
- `dist/`: Compiled JavaScript files (generated after build)

## Development

To add new features or fix bugs:

1. Make changes to the TypeScript files in the `src` directory
2. Build the project with `yarn build`
3. Run tests with `yarn test`
4. Start the server with `yarn start <config file>`

For faster development, you can use `yarn dev <config file>` which uses ts-node to run the TypeScript code directly without a separate build step. 