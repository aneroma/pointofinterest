'use strict';

const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const ImageStore = {
    configure: function(credentials) {
        cloudinary.config(credentials);
    },

    getAllImages: async function() {
        const result = await cloudinary.api.resources();
        return result.resources;
    },

    uploadImage: async function(path) {
        const cloudImage = await cloudinary.uploader.upload(path)
            fs.readdir('./public/uploads/', (err, files) => {
                if (err) throw err;

                for (const file of files) {
                    fs.unlink(path, err => {
                        if (err) throw err;
                    });
                }
            });
        return cloudImage;
    },
};


module.exports = ImageStore;
