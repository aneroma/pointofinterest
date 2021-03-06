'use strict';

require('dotenv').config();
const fs = require('fs');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const PointOfInterest = require('../models/pointOfInterest');
const User = require('../models/user');
const Category = require('../models/category');
const ImageStore = require('../utils/image-store');

const PointsOfInterest = {
    home: {
        handler: async function(request, h) {
            const id = request.auth.credentials.id;
            const user = await User.findById(id);
            const pointsOfInterest = await PointOfInterest.find().populate('contributor').populate('categories').lean();
            const userPOIs = await PointOfInterest.find({'contributor': id}).populate('contributor').populate('categories').lean();
            const userCategories = await Category.find({"contributor": id});
            const allUsers = await User.find({ 'isAdmin': false });
            return h.view('home', {
                  title: user.isAdmin ? 'Admin Dashboard' : 'User Dashboard',
                  user: user,
                  users: allUsers,
                  userCategories: userCategories,
                  pointsOfInterest: user.isAdmin ? pointsOfInterest : userPOIs
              },
              { runtimeOptions: {
                      allowProtoMethodsByDefault: true,
                      allowProtoPropertiesByDefault: true
                  }
              });

        }
    },
    report: {
        handler: async function(request, h) {
            const id = request.auth.credentials.id;
            const user = await User.findById(id);
            const pointsOfInterest = await PointOfInterest.find().populate('contributor').populate('categories').lean();
            return h.view('report', {
                title: 'Points of Interest added to date',
                user: user,
                pointsOfInterest: pointsOfInterest
            }, { runtimeOptions: {
                    allowProtoMethodsByDefault: true,
                    allowProtoPropertiesByDefault: true
                }
            });
        }
    },
    addPOI: {
        validate: {
            payload: {
                name: Joi.string().required(),
                description: Joi.string().required(),
                lat: Joi.number().required(),
                lon: Joi.number().required(),
                categories: Joi.any(),
                image: Joi.any().required()
            },
            options: {
                abortEarly: false
            },
            failAction: async function(request, h, err) {
                const id = request.auth.credentials.id;
                const user = await User.findById(id);
                const pointsOfInterest = await PointOfInterest.find().populate('contributor').lean();
                const userPOIs = await PointOfInterest.find({'contributor': id});
                const userPOIArray = [];
                for (let id of userPOIs) {
                    let poi = await PointOfInterest.findOne().where({'_id': id}).lean();
                    userPOIArray.push(poi);
                }
                const allUsers = await User.find({ 'isAdmin': false });
                return h.view('home', {
                      title: user.isAdmin ? 'Admin Dashboard' : 'User Dashboard',
                      user: user,
                      users: allUsers,
                      pointsOfInterest: user.isAdmin ? pointsOfInterest : userPOIArray,
                      errors: [{ message: err.message }]
                  },
                  { runtimeOptions: {
                          allowProtoMethodsByDefault: true,
                          allowProtoPropertiesByDefault: true
                      }
                  }
                ).takeover().code(400);
            }
        },
        handler: async function (request, h) {
            try {
                const id = request.auth.credentials.id;
                const user = await User.findById(id);
                const data = request.payload;

                if (data.image._data == 0) {
                    const message = 'No image selected';
                    throw Boom.unauthorized(message);
                }

                const name = data.image.hapi.filename;
                const now = new Date().toISOString();
                const path = `./public/uploads/${name}${now}`;
                const file = await fs.createWriteStream(path);

                await data.image.pipe(file);

                const cloudImage = await ImageStore.uploadImage(path);

                const newPOI = await new PointOfInterest({
                    name: data.name,
                    description: data.description,
                    location: {
                        lat: data.lat,
                        lon: data.lon,
                    },
                    categories: data.categories,
                    contributor: user._id,
                    imageURL: [cloudImage.url]
                });
                newPOI.thumbnailURL = newPOI.imageURL[0];
                await newPOI.save();
                user.contributedPOIs++;
                await user.save();
                return h.redirect('/home');
            } catch (err) {
                const id = request.auth.credentials.id;
                const user = await User.findById(id);
                const pointsOfInterest = await PointOfInterest.find().populate('contributor').lean();
                const userPOIs = await PointOfInterest.find({'contributor': id});
                const userPOIArray = [];
                for (let id of userPOIs) {
                    let poi = await PointOfInterest.findOne().where({'_id': id}).lean();
                    userPOIArray.push(poi);
                }
                const allUsers = await User.find({ 'isAdmin': false });
                return h.view('home', {
                      title: user.isAdmin ? 'Admin Dashboard' : 'User Dashboard',
                      user: user,
                      users: allUsers,
                      pointsOfInterest: user.isAdmin ? pointsOfInterest : userPOIArray,
                      errors: [{ message: err.message }]
                  },
                  { runtimeOptions: {
                          allowProtoMethodsByDefault: true,
                          allowProtoPropertiesByDefault: true
                      }
                  }
                );
            }
        },
        payload: {
            output: 'stream',
            parse: true,
            multipart: true
        }
    },
    showPOI: {
        handler: async function(request, h) {
            const id = request.auth.credentials.id;
            const user = await User.findById(id);
            const poi = await PointOfInterest
              .findOne()
              .where({'_id': request.params})
              .populate('contributor')
              .populate('categories')
              .lean();
            const imageURLs  = [];
            for (let i = 0; i < poi.imageURL.length - 1; i++) {
                imageURLs.push(poi.imageURL[i+1]);
            }
            const compare = `${user._id}&${poi.contributor._id}`;
            return h.view('poi', {
                title: `${poi.name} Settings`,
                user: user,
                poi: poi,
                thumbnail: poi.thumbnailURL,
                imageURLs: imageURLs,
                compare: compare,
            }, { runtimeOptions: {
                    allowProtoMethodsByDefault: true,
                    allowProtoPropertiesByDefault: true
                }
            });
        }
    },
    showUpdatePOI: {
        handler: async function(request, h) {
            const id = request.auth.credentials.id;
            const user = await User.findById(id);
            const poi = await PointOfInterest
              .findOne()
              .where({'_id': request.params})
              .populate('contributor')
              .populate('categories')
              .lean();
            const imageURLs  = [];
            for (let i = 0; i < poi.imageURL.length - 1; i++) {
                imageURLs.push(poi.imageURL[i+1]);
            }
            return h.view('updatepoi', {
                title: `${poi.name} Settings`,
                user: user,
                poi: poi,
                thumbnail: poi.thumbnailURL,
                imageURLs: imageURLs
            }, { runtimeOptions: {
                    allowProtoMethodsByDefault: true,
                    allowProtoPropertiesByDefault: true
                }
            });
        }
    },
    updatePOI: {
        handler: async function (request, h) {
            const id = request.auth.credentials.id;
            let user = await User.findById(id);
            const poi = await PointOfInterest
              .findOne()
              .where({'_id': request.params})
              .populate('contributor')
              .lean();
            const contString = request.payload.contributor;
            if (user.isAdmin) {
                user = await User.findByFullName(contString);
            }
            const poiEdit = {
                name: request.payload.name,
                description: request.payload.description,
                location: {
                    lat: request.payload.lat,
                    lon: request.payload.lon
                },
                thumbnailURL: request.payload.thumbnail,
                categories: request.payload.categories,
                imageURL: poi.imageURL,
                contributor: user._id
            };
            const newPOI = await PointOfInterest.findOneAndUpdate({'_id': request.params}, {$set: poiEdit},
              {
                  new: true,
                  useFindAndModify: false
              }, err => {
                  if (err) {
                      console.error(err);
                  }
              });
            await newPOI.save();
            return h.redirect(`/poi/${newPOI._id}`)
        }
    },
    deletePOI: {
        handler: async function (request, h) {
            const poi = await PointOfInterest.findOne().where({'_id': request.params})
            const user = await User.findOne().where({"_id": poi.contributor});
            /*const allUsers = await User.find({ 'isAdmin': false });
            for (let user of allUsers) {
                for (let id of user.contributedPOIs) {
                    if (id == request.params._id) {
                        let spliced = user.contributedPOIs.splice(user.contributedPOIs.indexOf(id),1);
                        console.log(spliced);
                        user.save();
                    }
                }
            }*/
            await PointOfInterest.deleteOne({'_id': request.params}, err => console.log(err));
            user.contributedPOIs--;
            await user.save();
            console.log('POI deleted');
            return h.redirect('/report');
        }
    },
    addCategory: {
        handler: async function (request, h) {
            const id = request.auth.credentials.id;
            const user = await User.findById(id);
            const data = request.payload;
            const newCategory = await new Category({
                name: data.name,
                description: "",
                contributor: user._id
            });
            await newCategory.save();
            user.customCategories++;
            await user.save();
            return h.redirect('/home');
        }
    },
    addImage: {
        handler: async function (request, h) {
            const id = request.auth.credentials.id;
            const user = await User.findById(id);
            const poi = await PointOfInterest
              .findOne()
              .where({'_id': request.params})
              .populate('contributor')
              .lean();
            const data = request.payload;

            if (data.image._data == 0) {
                const message = 'No image selected';
                throw Boom.unauthorized(message);
            }

            const name = data.image.hapi.filename;
            const now = new Date().toISOString();
            const path = `./public/uploads/${name}${now}`;
            const file = await fs.createWriteStream(path);

            await data.image.pipe(file);

            const cloudImage = await ImageStore.uploadImage(path);

            const newArray = [...poi.imageURL];
            newArray.push(cloudImage.url);

            const poiEdit = {
                name: poi.name,
                description: poi.description,
                location: {
                    lat: poi.location.lat,
                    lon: poi.location.lon
                },
                thumbnailURL: poi.thumbnailURL,
                categories: poi.categories,
                imageURL: newArray,
                contributor: poi.contributor
            };
            const newPOI = await PointOfInterest.findOneAndUpdate({'_id': request.params}, {$set: poiEdit},
              {
                  new: true,
                  useFindAndModify: false
              }, err => {
                  if (err) {
                      console.error(err);
                  }
              });
            await newPOI.save();
            return h.redirect(`/poi/${newPOI._id}`);
        },
        payload: {
            output: 'stream',
            parse: true,
            multipart: true
        }
    }
};

module.exports = PointsOfInterest;