"use strict";

var expect = require("expect.js"),
    _ = require("lodash");

var mongoose = require("mongoose-q")(),
    Schema = mongoose.Schema;

var mongoVersion2 = require("../lib/index");

function assert(e, message) { if (!e) throw new Error(message); }

describe("mongoose-version2", function() {

    var connection, article, Article;

    before(function(done) {
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

        connection.on("connected", done);
    });

    after(function(done) {
        connection.close(done);
    });

    describe("basic", function() {

        before(function(done) {
            connection.db.dropDatabase(done);
        });

        var stolenMoney;

        it("creation", function(done) {
            stolenMoney = new Article({ title: "Someone stole money again!", author: "Yo Mamma" });

            stolenMoney.saveQ()
            .then(function(saved) {
                assert(saved, "Unable to save!");

                expect(saved).to.not.have.property("__v");
                expect(saved._v).to.be(0);

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
                expect(saved._v).to.be(1);

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
                expect(saved._v).to.be(2);

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
                expect(saved._v).to.be(3);

                return Article.VersionModel.find().count().execQ()
                .then(function(count) {
                    expect(count).to.be(3);
                });
            })
            .done(done, done);

        });

        it("remove", function(done) {

            Article.find({title: "Someone stole money again!"}).execQ()
            .then(function(found) {
                expect(found).to.have.length(1);
                return found[0].removeQ();
            })
            .then(function() {
                return Article.VersionModel.find().execQ()
                .then(function(versions) {
                    expect(versions).to.have.length(4);
                    // TODO should be sorted for stability
                    expect(versions[0]._action).to.be("save");
                    expect(versions[1]._action).to.be("save");
                    expect(versions[2]._action).to.be("save");
                    expect(versions[3]._action).to.be("remove");
                });
            })
            .then(function() {
                return Article.find().execQ();
            })
            .then(function(articles) {
                expect(articles).to.be.empty();
            })
            .done(done, done);

        });

    });

    describe("version collision", function() {

        before(function(done) {
            connection.db.dropDatabase(done);
        });

        it("refuse to save older version than current", function(done) {
            var _spy1 = false, _spy2 = false;

            var race = new Article({title: "The race"});
            race.saveQ()
            .then(function(race) {
                return Article.findOne({title: "The race"}).execQ();
            })
            .then(function(race2) {
                race2.title = "The race 2";
                return race2.saveQ();
            })
            .then(function(race2saved) {
                var spy1 = function() { _spy1 = true; },
                    spy2 = function() { _spy2 = true; };

                race.title = "The race update";
                return race.saveQ()
                .then(spy1, spy2);
            })
            .then(function() {
                expect(_spy1).to.be(false);
                expect(_spy2).to.be(true);
                return Article.find().execQ();
            })
            .then(function(articles) {
                expect(articles).to.have.length(1);
                expect(articles[0].title).to.be("The race 2");
            })
            .done(done, done);

        });

    });

    describe("dateTracking", function() {

        before(function(done) {
            connection.db.dropDatabase(done);
        });

        it("should track the creation and modification dates", function(done) {
            var timeMachine = new Article({title: "Timemachine invented!"});

            timeMachine.saveQ()
            .then(function(savedArticle) {
                expect(!!savedArticle._modified).to.be(true);
                expect(!!savedArticle._created).to.be(true);
                expect(savedArticle._modified).to.be(savedArticle._created);
                savedArticle.content = "<top secret>";
                return savedArticle.saveQ();
            })
            .then(function(savedArticle) {
                expect(!!savedArticle._modified).to.be(true);
                expect(!!savedArticle._created).to.be(true);
                expect(savedArticle._modified).to.not.be(savedArticle._created);
                savedArticle.content = "<top secret ;) >";
                return savedArticle.saveQ();
            })
            .then(function(savedArticle) {
                expect(!!savedArticle._modified).to.be(true);
                expect(!!savedArticle._created).to.be(true);
                expect(savedArticle._modified).to.not.be(savedArticle._created);

                return Article.VersionModel.find().execQ();
            })
            .then(function(versions) {
                expect(versions).to.have.length(2);
                expect(_.compact(_.pluck(versions,"_created"))).to.have.length(2);
                expect(_.compact(_.pluck(versions,"_modified"))).to.have.length(2);
            })
            .done(done, done);
        });

    });

});
