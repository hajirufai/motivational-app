# Using Postman MCP with Motivational Quotes API

This guide explains how to use Postman MCP (Machine Collaboration Protocol) to run and test the Motivational Quotes API collection.

## What is Postman MCP?

Postman MCP (Machine Collaboration Protocol) is a protocol that allows machines to collaborate with each other using Postman's API platform. It enables you to run Postman collections programmatically and integrate them with your development workflow.

## Prerequisites

- Node.js installed on your machine
- `npx` installed (comes with Node.js)
- Postman account with an API key

## Setup

1. The Postman MCP integration is already configured in this project with the following components:
   - Postman collection file: `postman/motivational-quotes-api.json`
   - Postman environment file: `postman/environment.json`
   - MCP runner script: `src/scripts/run-postman-mcp.js`

2. The MCP runner script uses the following command to run the collection:
   ```
   npx mcp-remote https://mcp.postman-beta.com/mcp --header "Authorization: Bearer YOUR_API_KEY" run-collection --collection COLLECTION_PATH --environment ENVIRONMENT_PATH
   ```

## Running the Postman Collection with MCP

You can run the Postman collection using MCP with the following npm script:

```bash
npm run test:postman:mcp
```

This will execute the collection using the Postman MCP server and display the results in the terminal.

## Customizing the MCP Integration

### Updating the API Key

If you need to update the Postman API key, edit the `src/scripts/run-postman-mcp.js` file and replace the token in the `Authorization` header.

### Modifying the Collection

You can modify the Postman collection by:

1. Importing the collection into Postman
2. Making your changes
3. Exporting the collection back to the `postman/motivational-quotes-api.json` file

### Updating the Environment

You can update the environment variables by editing the `postman/environment.json` file directly or by exporting an updated environment from Postman.

## Troubleshooting

### Authentication Issues

If you encounter authentication issues, ensure that:
- Your Postman API key is valid and has not expired
- You have the necessary permissions to run collections

### Collection Execution Errors

If the collection fails to execute:
- Check that the server is running on the correct port (default: 5001)
- Verify that the environment variables are correctly set
- Examine the error messages in the terminal output for specific issues

## Additional Resources

- [Postman MCP Documentation](https://learning.postman.com/docs/developer/postman-api/intro-api/)
- [Postman API Reference](https://documenter.getpostman.com/view/631643/JsLs/?version=latest)