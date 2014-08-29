# Mongoose Version

Mongoose Version is a mongoose plugin that automatically versions documents as they're modified.
The previous versions are saved into a separate mongo collection.

!!!It disables the default mongoose3 versioning!!!

## Installation

    $ npm install mongoose-version2

## Usage

To use mongoose-version for an existing mongoose schema you'll have to require and plugin mongoose-version into the
existing schema.

The following schema definition defines a "Page" schema, and uses mongoose-version plugin with default options

    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        version = require('mongoose-version');

    var Page = new Schema({
        title : { type : String, required : true},
        content : { type : String, required : true },
        path : { type : String, required : true},
        tags : [String],
    });

    Page.plugin(version, {});

**Mongoose-version** will define a schema that has all the same properties as Page plus a *\_refId* field pointing to the original model.

**Mongoose-version** will add a static field *VersionedModel* to **Page** that can be used to access the versioned
model of **Page**, for example for querying old versions of a document.

## Option keys and defaults

* **versionProperty** - the name of the property holding the version number
* **modelName** - name of the mognoose model

## Fork info

This is a based on https://github.com/saintedlama/mongoose-version.

### Reasons for forking:

* The original doesn't support multiple connections
* The original is completely wroing as a mongoose plugin, as a schema
  can be instantiated as multiple models (multiple times) but the plugin
  doesn't support it.
* Complex code for such a simple plugin
* Strange work with the mongoose \__v property
* Unneeded mongoose requirement
* Weird versioning action on document removal
