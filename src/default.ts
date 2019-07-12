module.exports.defaultHandler = (event, _context, callback) => {
    callback(null, {
        statusCode: 200,
        body: 'defaultHandler'
    });
};
