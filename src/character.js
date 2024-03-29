const db = require("./db.js");
module.exports = function(app, path, ejs, fs) {
  app.get("/character", function(req, res) {
    if (!req.query.CHAR || req.query.CHAR == "true") {
      db.char(req.query.id, info => {
        db.charput(info, result => {
          LOGS("VIEWCHAR", req, result);
          var moment = require("moment");
          res.render('character', {
            user: req.session.db,
            char: result,
            visi: [
            "Waiting",
            "Public",
            "Private",
            "Secret",
            "Top secret",
            "Extremely Secret",
            "IT Developer"
            ],
            moment: moment
          })
        }
        );
      });
    } else {
      db.tagSearch(req.query.tags, req, function(docs) {
        LOGS("VIEWTAG", req, req.query.tags);
        res.render('tag', {
          user: req.session.db,
          char: docs,
          visi: [
          "Waiting",
          "Public",
          "Private",
          "Secret",
          "Top secret",
          "Extremely Secret",
          "IT Developer"
          ],
          tag: req.query.tags
        })
      });
    }
  });

  app.get("/api/corp/:id", function(req, res) {
    db.corp(req.params.id, function(result) {
      res.json(result);
    });
  });

  app.get("/api/char/corpname/:id", function(req, res) {
    db.char(req.params.id, function(result) {
      db.corp(result.basic.corporation_id, function(result2) {
        res.json(result2.name);
      });
    });
  });

  app.get("/api/alliance/:id", function(req, res) {
    db.alliance(req.params.id, function(result) {
      res.json(result);
    });
  });

  app.post("/api/alts/unlink", function(req, res) {
    if (req.session.db.role >= 5) {
      CHAR.findById(req.body.id)
      .populate({
        path: 'alts'
      }).exec((err, doc) => {
        doc.alts.alts.splice(doc.alts.alts.indexOf(req.body.id), 1);
        console.log('[UNLINK] ' + req.body.id + " from : " + doc.alts);
        if (doc.alts.alts.length == 1) {
          CHAR.findById(doc.alts.alts[0]).exec((err, docc) => {
            docc.alts = undefined;
            docc.save();
          })
        }
        doc.alts.save().then(() => {
          doc.alts = undefined;
          doc.save().then(() => {
            res.status(200).send(doc);
          })
        })
      })
    } else {
      res.sendStatus(401);
    }
  })

  app.post("/api/alts/link", function(req, res) {
    if (req.body.alt && req.body.main) {
      db.char(req.body.alt, function(info) {
        db.charput(info, result => {
          //result = le new perso
          CHAR.findById(req.body.main)
          .populate({
            path: "alts"
          })
          .exec((err, doc) => {
            if (err) {
              res.status(500).send(err);
              return;
            }
            if (result.db.alts != null) {
              res.status(301).send("Already on alts group");
            } else if (result.db.alts == null && doc.alts == null) {
              const alts = new ALT();
              alts.alts.push(doc);
              alts.alts.push(result.db);
              alts.save().then(() => {
                result.db.alts = alts;
                result.db.save().then(() => {
                  doc.alts = alts;
                  LOGS("ADDLINK", req, { new: result, old: doc });
                  doc.save().then(() => {
                    res.status(200).send("No alts for 2 people");
                  });
                });
              });
            } else if (result.db.alts == null && doc.alts != null) {
              doc.alts.alts.push(result.db);
              doc.alts.save().then(() => {
                result.db.alts = doc.alts;
                result.db.save();
                LOGS("ADDLINK", req, { new: result, old: doc });
                res.status(200).send("Add an alts");
              });
            } else {
              res.status(500).send("What the fuck");
            }
          });
        });
      });
    } else {
      res.status(500).send("What the fuck");
    }
  });

  app.post("/api/tags/add", function(req, res) {
    if (req.body.id && req.body.name && req.body.visibility && req.body._id) {
      let tags = {
        from: req.body._id,
        name: req.body.name,
        visibility: req.body.visibility
      };
      CHAR.findById(req.body.id).exec((err, doc) => {
        if (err) res.send(err);
        LOGS("ADDTAG", req, doc);
        doc.tags.push(tags);
        doc.save((err, result) => {
          if (err) res.sendStatus(500);
          res.sendStatus(200);
        });
      });
    } else {
      res.sendStatus(404);
    }
  });

  app.post("/api/intel/add", function(req, res) {
    if (
      req.body.links &&
      req.body.comment &&
      req.body.from &&
      req.body.visibility &&
      req.body.type &&
      req.body.action &&
      req.body.id
      ) {
      let intel = {
        links: req.body.links,
        comment: req.body.comment,
        action: req.body.action,
        visibility: req.body.visibility,
        type: req.body.type,
        date: new Date(),
        from: {
          id: req.body.id,
          name: req.body.name
        }
      };
      const intels = new INTELS(intel);
      intels.save().then(() => {
        CHAR.findById(req.body.id).exec((err, docc) => {
          docc.intels.push(intels);
          LOGS("ADDINTEL", req, docc);
          docc.save((err, result) => {
            if (err) res.sendStatus(500);
            res.sendStatus(200);
          });
        });
      });
    } else {
      res.sendStatus(404);
    }
  });

  app.get("/api/character/search/:name", function(req, res) {
    db.search(req.params.name, function(err, rep) {
      if (err) res.json(err);
      else res.json(rep);
    });
  });
};
