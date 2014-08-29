"use strict";

var expect = require("expect.js"),
    Q = require("q");

var mongoose = require("mongoose-q")(),
    Schema = mongoose.Schema;

var mongoVersion2 = require("../lib/index");

function assert(e, message) { if (!e) throw new Error(message); }

describe("mongoose-version2", function() {

    var connection, article, Article;

    before(function() {
        connection = mongoose.createConnection("mongodb://localhost/mongoose-version2");

        article = new Schema({
            title: String,
            author: String,
            content: String,
            comments: [new Schema({
                author: String,
                content: String
            })]
        });

        article.plugin(mongoVersion2, {});

        Article = connection.model("Article", article);
    });

    after(function(done) {
        connection.close(done);
        connection = article = Article = null;
    });

    describe("basic", function() {

        var stolenMoney;

        after(function(done) {
            Q.all([
                Article.remove().execQ(),
                Article.VersionModel.remove().execQ()
            ]).done(function() { done(); }, done);
        });

        it("creation", function(done) {
            stolenMoney = new Article({ title: "Someone stole money again!", author: "Yo Mamma" });

            stolenMoney.saveQ()
            .then(function(saved) {
                assert(saved, "Unable to save!");

                expect(saved).to.not.have.property("__v");
                expect(saved.__ver).to.be(0);

                return Article.VersionModel.find().count().execQ()
                .then(function(count) {
                    expect(count).to.be(0);
                })
                .then(function() {
                    return saved.saveQ();
                });
            })
            .then(function(saved) {
                assert(saved, "Unable to save!");

                expect(saved).to.not.have.property("__v");
                expect(saved.__ver).to.be(1);

                return Article.VersionModel.find().count().execQ()
                .then(function(count) {
                    expect(count).to.be(1);
                })
                .then(function() {
                    return saved.saveQ();
                });
            })
            .then(function(saved) {
                assert(saved, "Unable to save!");
                expect(saved).to.not.have.property("__v");
                expect(saved.__ver).to.be(2);

                return Article.VersionModel.find().count().execQ()
                .then(function(count) {
                    expect(count).to.be(2);
                });
            })
            .done(done, done); // lol

        });

        it("update", function(done) {

            Article.find({title: "Someone stole money again!"}).execQ()
            .then(function(found) {
                expect(found).to.have.length(1);
                return found[0].saveQ();
            })
            .then(function(saved) {
                assert(saved, "Unable to save!");

                expect(saved).to.not.have.property("__v");
                expect(saved.__ver).to.be(3);

                return Article.VersionModel.find().count().execQ()
                .then(function(count) {
                    expect(count).to.be(3);
                });
            })
            .done(done, done);

        });

    });

});
