"use strict";
const User = require("../models/user");
const Boom = require("@hapi/boom");
const Joi = require('@hapi/joi');

const Accounts = {
    index: {
        auth: false,
        handler: function(request, h) {
            return h.view("main", { title: "Welcome to Poi App" });
        }
    },
    showSignup: {
        auth: false,
        handler: function(request, h) {
            return h.view("signup", { title: "Sign up for more" });
        }
    },
    signup: {
        auth: false,
        handler: async function(request, h) {
            try {
                const payload = request.payload;
                let user = await User.findByEmail(payload.email);
                if (user) {
                    const message = "Email address is already registered";
                    throw Boom.badData(message);
                }
                const newUser = new User({
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    email: payload.email,
                    password: payload.password
                });
                user = await newUser.save();
                request.cookieAuth.set({ id: user.id });
                return h.redirect("/home");
            } catch (err) {
                return h.view("signup", { errors: [{ message: err.message }] });
            }
        }
    },
    showLogin: {
        auth: false,
        handler: function(request, h) {
            return h.view("login", { title: "Login to Poi app" });
        }
    },
    login: {
        auth: false,
        handler: async function(request, h) {
            const { email, password } = request.payload;
            try {
                let user = await User.findByEmail(email);
                if (!user) {
                    const message = "Email address is not registered";
                    throw Boom.unauthorized(message);
                }
                user.comparePassword(password);
                request.cookieAuth.set({ id: user.id });
                return h.redirect("/home");
            } catch (err) {
                return h.view("login", { errors: [{ message: err.message }] });
            }
        }
    },
    logout: {
        handler: function(request, h) {
            request.cookieAuth.clear();
            return h.redirect("/");
        }
    },

    showSettings: {
        handler: async function(request, h) {
            try {
                const id = request.auth.credentials.id;
                const user = await User.findById(id).lean();
                return h.view("settings", { title: "User Settings", user: user });
            } catch (err) {
                return h.view("login", { errors: [{ message: err.message }] });
            }
        }
    },
    updateSettings: {
        validate: {
            payload: {
                firstName: Joi.string().required(),
                lastName: Joi.string().required(),
                email: Joi.string()
                  .email()
                  .required(),
                password: Joi.string().required()
            },
            options: {
                abortEarly: false
            },
            failAction: function(request, h, error) {
                return h
                  .view('settings', {
                      title: 'Sign up error',
                      errors: error.details
                  })
                  .takeover()
                  .code(400);
            }
        },

        //edit the deatils of the user and save the new details
        handler: async function(request, h) {
            try {
                const userEdit = request.payload;
                const id = request.auth.credentials.id;
                const user = await User.findById(id);

                const hash = await bcrypt.hash(userEdit.password, saltRounds);

                user.firstName = userEdit.firstName;
                user.lastName = userEdit.lastName;
                user.email = userEdit.email;
                user.password = hash;

                await user.save();

                return h.redirect('results');
            } catch (err) {
                return h.view('main', {errors: [{message: err.message}]});
            }
        }
    },

    /*
    Delete user function, allows the user to delete their account
    This function will call the deleteUserById method in the user.js script
     */
    deleteUser: {

        handler: async function(request, h){

            await User.deleteUserById(request.auth.credentials.id);

            //Once the user account has been deleted redirect to the index page
            return h.redirect('/');

        }

    },


};
module.exports = Accounts;