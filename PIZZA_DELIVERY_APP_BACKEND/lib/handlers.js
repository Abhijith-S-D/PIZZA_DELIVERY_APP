/*
 * Request Handlers
 *
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
var menus = require('./menus');

// Define all the handlers
var handlers = {};

// Not-Found
handlers.notFound = function (data, callback) {
  callback(404);
};

// Users
handlers.users = function (data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else if (data.method === 'options') {
    callback(200);
  } else {
    callback(405);
  }
};

// Container for all the users methods
handlers._users = {};

// Users - post
// Required data: name, email, address, password
// Optional data: none
handlers._users.post = function (data, callback) {
  // Check that all required fields are filled out
  var name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
  var email = helpers.validateEmail(data.payload.email) ? data.payload.email.trim() : false;
  var address = typeof (data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if (name && email && address && password) {
    // Make sure the user doesnt already exist
    _data.read('users', email, function (err, data) {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          var userObject = {
            'name': name,
            'email': email,
            'address': address,
            'hashedPassword': hashedPassword
          };

          // Store the user
          _data.create('users', email, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { 'Error': 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { 'Error': 'Could not hash the user\'s password.' });
        }

      } else {
        // User alread exists
        callback(400, { 'Error': 'A user with that email already exists' });
      }
    });

  } else {
    callback(400, { 'Error': 'Missing required fields' });
  }

};

// Required data: email
// Optional data: none
handlers._users.get = function (data, callback) {
  // Check that email is valid
  var email = helpers.validateEmail(data.queryStringObject.email) ? data.queryStringObject.email.trim() : false;
  if (email) {

    // Get token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the email
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', email, function (err, data) {
          if (!err && data) {
            // Remove the hashed password from the user user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { "Error": "Missing required token in header, or token is invalid." })
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
};

// Required data: email
// Optional data: name, address, password (at least one must be specified)
handlers._users.put = function (data, callback) {
  // Check for required field
  var email = helpers.validateEmail(data.payload.email) ? data.payload.email.trim() : false;

  // Check for optional fields
  var name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
  var address = typeof (data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if email is invalid
  if (email) {
    // Error if nothing is sent to update
    if (name || address || password) {

      // Get token from headers
      var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the email
      handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
        if (tokenIsValid) {

          // Lookup the user
          _data.read('users', email, function (err, userData) {
            if (!err && userData) {
              // Update the fields if necessary
              if (name) {
                userData.name = name;
              }
              if (address) {
                userData.address = address;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users', email, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { 'Error': 'Could not update the user.' });
                }
              });
            } else {
              callback(400, { 'Error': 'Specified user does not exist.' });
            }
          });
        } else {
          callback(403, { "Error": "Missing required token in header, or token is invalid." });
        }
      });
    } else {
      callback(400, { 'Error': 'Missing fields to update.' });
    }
  } else {
    callback(400, { 'Error': 'Missing required field.' });
  }

};

// Required data: email
// Cleanup old carts associated with the user
handlers._users.delete = function (data, callback) {
  // Check that email is valid
  var email = helpers.validateEmail(data.queryStringObject.email) ? data.queryStringObject.email.trim() : false;
  if (email) {

    // Get token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', email, function (err, userData) {
          if (!err && userData) {
            // Delete the user's data
            _data.delete('users', email, function (err) {
              if (!err) {
                // Delete each of the cart items associated with the user
                var userCart = typeof (userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                var cartItemsToDelete = userCart.length;
                if (cartItemsToDelete > 0) {
                  var cartItemsDeleted = 0;
                  var deletionErrors = false;
                  // Loop through the cart Items
                  userCart.forEach(function (itemId) {
                    // Delete the cart item
                    _data.delete('carts', itemId, function (err) {
                      if (err) {
                        deletionErrors = true;
                      }
                      cartItemsDeleted++;
                      if (cartItemsDeleted == cartItemsToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, { 'Error': "Errors encountered while attempting to delete all of the user's cart items. All cart items may not have been deleted from the system successfully." })
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { 'Error': 'Could not delete the specified user' });
              }
            });
          } else {
            callback(400, { 'Error': 'Could not find the specified user.' });
          }
        });
      } else {
        callback(403, { "Error": "Missing required token in header, or token is invalid." });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
};

// Tokens
handlers.tokens = function (data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else if (data.method === 'options') {
    callback(200);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: email, password
// Optional data: none
handlers._tokens.post = function (data, callback) {
  var email = helpers.validateEmail(data.payload.email) ? data.payload.email.trim() : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (email && password) {
    // Lookup the user who matches that email
    _data.read('users', email, function (err, userData) {
      if (!err && userData) {
        // Hash the sent password, and compare it to the password stored in the user object
        var hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // If valid, create a new token with a random name. Set an expiration date 1 hour in the future.
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            'email': email,
            'id': tokenId,
            'expires': expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { 'Error': 'Could not create the new token' });
            }
          });
        } else {
          callback(400, { 'Error': 'Password did not match the specified user\'s stored password' });
        }
      } else {
        callback(400, { 'Error': 'Could not find the specified user.' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field(s).' })
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
  // Check that id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field, or field invalid' })
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
  var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if (id && extend) {
    // Lookup the existing token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update('tokens', id, tokenData, function (err) {
            if (!err) {
              callback(200, tokenData);
            } else {
              callback(500, { 'Error': 'Could not update the token\'s expiration.' });
            }
          });
        } else {
          callback(400, { "Error": "The token has already expired, and cannot be extended." });
        }
      } else {
        callback(400, { 'Error': 'Specified user does not exist.' });
      }
    });
  } else {
    callback(400, { "Error": "Missing required field(s) or field(s) are invalid." });
  }
};


// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
  // Check that id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        // Delete the token
        _data.delete('tokens', id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { 'Error': 'Could not delete the specified token' });
          }
        });
      } else {
        callback(400, { 'Error': 'Could not find the specified token.' });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, email, callback) {
  // Lookup the token
  _data.read('tokens', id, function (err, tokenData) {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.email == email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Cart
handlers.carts = function (data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._carts[data.method](data, callback);
  } else if (data.method === 'options') {
    callback(200);
  } else {
    callback(405);
  }
};

// Container for all the carts methods
handlers._carts = {};


// Carts - post (Add to cart)
// Required data: menuId,quantity,email
// Optional data: none
handlers._carts.post = function (data, callback) {
  // Validate inputs
  var menuId = typeof (data.payload.menuId) == 'number' && !(data.payload.menuId > 10 || data.payload.menuId <= 0) ? data.payload.menuId : false;
  var quantity = typeof (data.payload.quantity) == 'number' && data.payload.quantity > 0 ? data.payload.quantity : false;
  var email = helpers.validateEmail(data.payload.email) ? data.payload.email.trim() : false;
  if (menuId && quantity && email) {

    // Get token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user email by reading the token
        _data.read('tokens', token, function (err, tokenData) {
          if (!err && tokenData) {
            var userEmail = tokenData.email;

            // Lookup the user data
            _data.read('users', userEmail, function (err, userData) {
              if (!err && userData) {
                var userCart = typeof (userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                // Verify that user has less than the number of max-Cart Items per user
                if (userCart.length < config.maxCartItems) {
                  // Create random id for cart item
                  var itemId = helpers.createRandomString(20);

                  // Create cart item object including userEmail
                  var CartItemObject = {
                    'id': itemId,
                    'userEmail': userEmail,
                    'menuId': menuId,
                    'quantity': quantity
                  };

                  // Save the object
                  _data.create('carts', itemId, CartItemObject, function (err) {
                    if (!err) {
                      // Add cart item id to the user's object
                      userData.cart = userCart;
                      userData.cart.push(itemId);

                      // Save the new user data
                      _data.update('users', userEmail, userData, function (err) {
                        if (!err) {
                          // Return the data about the new cartItem
                          callback(200, CartItemObject);
                        } else {
                          callback(500, { 'Error': 'Could not update the user with the new cart item.' });
                        }
                      });
                    } else {
                      callback(500, { 'Error': 'Could not create the new cart Item' });
                    }
                  });



                } else {
                  callback(400, { 'Error': 'The user already has the maximum number of cart Item (' + config.maxCartItems + ').' })
                }


              } else {
                callback(403);
              }
            });


          } else {
            callback(403);
          }
        });

      } else {
        callback(403, { "Error": "Missing required token in header, or token is invalid." });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required inputs, or inputs are invalid' });
  }
};

// carts - get (List added cart items)
// Required data: email
// Optional data: none
handlers._carts.get = function (data, callback) {
  // Check that email is valid
  var email = helpers.validateEmail(data.queryStringObject.email) ? data.queryStringObject.email.trim() : false;
  if (email) {
    // Lookup the check
    // Get token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', email, function (err, userData) {
          if (!err && userData) {
            var userCart = typeof (userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
            // Verify that user has less than the number of max-Cart Items per user
            if (userCart.length <= config.maxCartItems) {
              var cartData = { 'items': [] };
              // Loop through the cart Items
              var cartPopulatorPromises = userCart.map(function (itemId) {
                return new Promise(function (resolve, reject) {
                  _data.read('carts', itemId, function (err, cartItemData) {
                    if (!err && cartItemData) {
                      resolve(cartItemData);
                    } else {
                      callback(404);
                    }
                  });
                });
              });
              // Return cart data
              Promise.all(cartPopulatorPromises).then(function (items) {
                cartData.items = items;
                callback(200, cartData);
              });
            } else {
              callback(400, { 'Error': 'The user already has the maximum number of cart Item (' + config.maxCartItems + ').' })
            }
          } else {
            callback(400, { 'Error': 'Specified user does not exist.' });
          }
        });
      } else {
        callback(403, { "Error": "Missing required token in header, or token is invalid." });
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required field, or field invalid' })
  }
};

// Carts - put
// Required data: id
// Optional data: menuId,quantity(one must be sent)
handlers._carts.put = function (data, callback) {
  // Check for required field
  var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for optional fields
  var menuId = typeof (data.payload.menuId) == 'number' && !(data.payload.menuId > 10 || data.payload.menuId <= 0) ? data.payload.menuId : false;
  var quantity = typeof (data.payload.quantity) == 'number' && data.payload.quantity > 0 ? data.payload.quantity : false;

  // Error if id is invalid
  if (id) {
    // Error if nothing is sent to update
    if (menuId || quantity) {
      // Lookup the cart Item
      _data.read('carts', id, function (err, cartItemData) {
        if (!err && cartItemData) {
          // Get the token that sent the request
          var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
          // Verify that the given token is valid and belongs to the user who created the cartItem
          handlers._tokens.verifyToken(token, cartItemData.userEmail, function (tokenIsValid) {
            if (tokenIsValid) {
              // Update cart item data where necessary
              if (menuId) {
                cartItemData.menuId = menuId;
              }
              if (quantity) {
                cartItemData.quantity = quantity;
              }
              // Store the new updates
              _data.update('carts', id, cartItemData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { 'Error': 'Could not update the cart item.' });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400, { 'Error': 'Item ID did not exist.' });
        }
      });
    } else {
      callback(400, { 'Error': 'Missing fields to update.' });
    }
  } else {
    callback(400, { 'Error': 'Missing required field.' });
  }
};


// Carts - delete
// Required data: id
// Optional data: none
handlers._carts.delete = function (data, callback) {
  // Check that id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the cart
    _data.read('carts', id, function (err, cartItemData) {
      if (!err && cartItemData) {
        // Get the token that sent the request
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the cart item
        handlers._tokens.verifyToken(token, cartItemData.userEmail, function (tokenIsValid) {
          if (tokenIsValid) {

            // Delete the cart item data
            _data.delete('carts', id, function (err) {
              if (!err) {
                // Lookup the user's object to get all their cart items
                _data.read('users', cartItemData.userEmail, function (err, userData) {
                  if (!err) {
                    var userCart = typeof (userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];

                    // Remove the deleted cart item from their list of cart items
                    var itemPosition = userCart.indexOf(id);
                    if (itemPosition > -1) {
                      userCart.splice(itemPosition, 1);
                      // Re-save the user's data
                      userData.cart = userCart;
                      _data.update('users', cartItemData.userEmail, userData, function (err) {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, { 'Error': 'Could not update the user.' });
                        }
                      });
                    } else {
                      callback(500, { "Error": "Could not find the cart item on the user's object, so could not remove it." });
                    }
                  } else {
                    callback(500, { "Error": "Could not find the user who created the cart item, so could not remove the cart item from the cart on their user object." });
                  }
                });
              } else {
                callback(500, { "Error": "Could not delete the cart item data." })
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { "Error": "The item ID specified could not be found" });
      }
    });
  } else {
    callback(400, { "Error": "Missing valid id" });
  }
};

// Order
handlers.orders = function (data, callback) {
  var acceptableMethods = ['post'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._orders[data.method](data, callback);
  } else if (data.method === 'options') {
    callback(200);
  } else {
    callback(405);
  }
};

// Container for all the orders methods
handlers._orders = {};

// Orders - post (Checkout to payment)
// Required data: email,cc
// Optional data: none
handlers._orders.post = function (data, callback) {
  // Validate inputs
  var email = helpers.validateEmail(data.payload.email) ? data.payload.email.trim() : false;
  var cc = typeof data.payload.cc == "string" ? data.payload.cc.trim() : false;
  if (email && cc) {

    // Get token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid and belongs to the user who created the cart item
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user email by reading the token
        _data.read('tokens', token, function (err, tokenData) {
          if (!err && tokenData) {
            var userEmail = tokenData.email;

            // Lookup the user data
            _data.read('users', userEmail, function (err, userData) {
              if (!err && userData) {
                var userCart = typeof (userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                // Verify that user has less than the number of max-Cart Items per user
                if (userCart.length <= config.maxCartItems) {
                  var cartData = { 'items': [] };
                  // Loop through the cart Items
                  userCart.forEach(function (itemId) {
                    _data.read('carts', itemId, function (err, cartItemData) {
                      if (!err && cartItemData) {
                        // Add the cart item to cart data
                        cartData.items.push(cartItemData);
                      } else {
                        callback(404);
                      }
                    });
                  });
                  var price = 0;
                  var desc = [];
                  cartData.items.forEach(i => {
                    price += menus[i.menuId].price * i.quantity;
                    desc.push(menus[i.menuId].name);
                  });
                  // Stripe don't allow paise
                  var amount = Math.round(price);
                  var currency = config.currency;
                  var description =
                    "Payment for: " +
                    desc.join(", ").replace(/\./g, "") +
                    ". Email: " +
                    email;
                  var orders = {
                    email,
                    currency,
                    amount,
                    items: cartData.items,
                    time: Date.now()
                  };
                  helpers.stripe(amount, currency, description, cc, result => {
                    if (result) {
                      // if payment is successful, create the order and save it under ./data/orders
                      _data.create("orders", email, orders, function (err) {
                        // once order saved, email the user
                        if (!err) {
                          var mailText = `Your payment for ${desc.join(", ").replace(/\./g, "")} is successful`;
                          helpers.mailgun(
                            "Order successful",
                            mailText,
                            result => {
                              if (result) {
                                // Loop through the cart Items
                                userCart.forEach(function (itemId) {
                                  _data.delete('carts', itemId, function (err) {
                                    if (!err) {
                                    } else {
                                      callback(500, {
                                        Error: "Could not delete the user cart"
                                      });
                                    }
                                  });
                                });

                                //empty the cart from user data as well
                                userData.cart = [];

                                // Store the new updates
                                _data.update('users', email, userData, function (err) {
                                  if (!err) {
                                    callback(200);
                                  } else {
                                    callback(500, { 'Error': 'Could not update the user.' });
                                  }
                                });

                              } else {
                                callback(500, {
                                  Error:
                                    "Could not send email but the payment however is successful"
                                });
                              }
                            }
                          );
                        } else {
                          callback(500, {
                            Error: "Could not create the orders."
                          });
                        }
                      });
                    } else {
                      callback(result);
                    }
                  });
                } else {
                  callback(400, { 'Error': 'The user already has the maximum number of cart Item (' + config.maxCartItems + ').' })
                }
              } else {
                callback(403);
              }
            });


          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required inputs, or inputs are invalid' });
  }
};

// Menus
handlers.menus = function (data, callback) {
  var acceptableMethods = ['get'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._menus[data.method](data, callback);
  } else if (data.method === 'options') {
    callback(200);
  } else {
    callback(405);
  }
};

// Container for all the menus methods
handlers._menus = {};

// Menus - get (View Menus)
// Required data: email
// Optional data: none
handlers._menus.get = function (data, callback) {
  // Validate inputs
  var email = helpers.validateEmail(data.queryStringObject.email) ? data.queryStringObject.email.trim() : false;
  if (email) {

    // Get token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid and belongs to the user
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (tokenIsValid) {
        callback(200, menus);
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { 'Error': 'Missing required inputs, or inputs are invalid' });
  }
};


// Export the handlers
module.exports = handlers;
