module.exports = function(app, path, ejs, fs) {
    /*
     * Route page d'acceuil
     * redirige les diferent role vers leurs pages
     */
     app.get('/members', function(req, res) {
       LOGS('VIEWMEMBERS', req);
       res.render('members', {'user': req.session.db})
     })

     app.post('/api/members/get', function(req, res) {
       USER.dataTables({
        find: {
            'role': {'$nin': [-1, 0]}
          },
         limit: req.body.length,
         skip: req.body.start,
         order: req.body.order,
         columns: req.body.columns,
         formatter: 'toPublic',
         search: {
           value: req.body.search.value,
           fields: ['name', 'corp']
         },
         sort: {
           name: 1
         }
       }).then(function (table) {
         res.json({
           data: table.data,
           recordsFiltered: table.total,
           recordsTotal: table.total
         });
       })
     })

     app.post('/api/members/columns', async function(req, res) {
      let resp = {};
      for (var i in req.body.columns) {
        resp[req.body.columns[i]] = await USER.distinct(req.body.columns[i]);
      }
      res.send(resp)
    })

     app.post('/api/members/role', function(req, res) {
      if (req.body._id && req.body.role) {
        if (req.body.role < req.session.db.role || req.session.db.role >= 5) {
          USER.findOneAndUpdate({
            '_id': req.body._id
          }, {
            role: req.body.role
          }).exec(function(err, ccc) {
            LOGS('CHANGEROLE', req, ccc);
            res.sendStatus(200);
          });
        } else {
          res.sendStatus(401);
        }
      } else {
        res.sendStatus(500);
      }
    })
   }