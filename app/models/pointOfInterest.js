'use strict';

const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;

const poiSchema = new Schema({
    name: String,
    description: String,
    location: {
        lat: Number,
        lon: Number
    },
    categories: [{
        type: Schema.Types.ObjectId,
        ref: 'Category'
    }],
    imageURL: [String],
    thumbnailURL: String,
    contributor: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { collection: 'PointOfInterest' });


module.exports = Mongoose.model('PointOfInterest', poiSchema);