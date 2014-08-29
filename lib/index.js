"use strict";

var functions = require("./functions"),
    extend = functions.extend,
    setProperty = functions.setProperty,
    clone = functions.clone,
    cloneSchema = functions.cloneSchema;

var defaultOptions = {
    versionProperty: "__ver",
    modelName: function(name) { return name + "_version"; },
    checkVersion: true
};

module.exports = function(schema, options) {

    var Schema = schema.constructor,
        ObjectId = Schema.Types.ObjectId;

    options = extend({}, defaultOptions, options);

    // maunally update the versionKey
    schema.set("versionKey", false);
    schema.add(setProperty({}, options.versionProperty, { type: Number, default: 0 }));

    schema.on("init", function(model) {

        var versionedSchema = cloneSchema(schema);
        versionedSchema.add({
            _refId : {
                type: ObjectId, // reference to the object
                ref: model.modelName
            },
            _action : {        // reason of versioning
                type: String,
                enum: ["save", "remove"]
            }
        });

        var VersionModel = model.VersionModel = model.db.model(options.modelName(model.modelName), versionedSchema);

        model.prototype.__genVersion = function() {
            var bkp = clone(this);
            bkp._refId = this._id; // Sets origins document id as a reference
            delete bkp._id;

            var bkpDocument = new VersionModel(bkp);
            return bkpDocument;
        };

    });

    schema.pre("save", function (next) {
        // TODO ignored fields
        // TODO dates
        var self = this;
        if (self.isNew) return next();

        if (!options.checkVersion)
            return save();

        self.constructor.findOne({_id: self._id}, function(err, current) {
            if (err)
                return next(err);

            if ( current[options.versionProperty]>self[options.versionProperty] )
                next(new Error("Trying to submit older version!"));
            else
                save();
        });

        function save() {
            var bkpDocument = self.__genVersion();
            bkpDocument._action = "save";
            self[options.versionProperty]++;
            bkpDocument.save(next);
        }
    });

    schema.pre("remove", function(next) {
        var bkpDocument = this.__genVersion();
        bkpDocument._action = "remove";
        this[options.versionProperty]++;
        bkpDocument.save(next);
    });

};
