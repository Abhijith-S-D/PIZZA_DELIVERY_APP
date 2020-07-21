/*
 * Create and export configuration variables
 *
 */

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : 'thisIsASecret',
  'maxCartItems' : 5,
  currency: "inr",
  stripeSecretKey: "sk_test_Tw7MiUyZuzC15v1wvBMYAYfN00C7Hnai3e",
  mailgunKey: "26719121ce167c92916833fdb380b13a-c322068c-7490ae82"
};

// Production environment
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret' : 'thisIsAlsoASecret',
  'maxCartItems' : 10,
  currency: "inr",
  stripeSecretKey: "sk_test_Tw7MiUyZuzC15v1wvBMYAYfN00C7Hnai3e",
  mailgunKey: "26719121ce167c92916833fdb380b13a-c322068c-7490ae82"
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
