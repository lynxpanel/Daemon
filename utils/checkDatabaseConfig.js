const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const sqliteService = require('../assets/services/sqliteService');
const mysqlService = require('../assets/services/mysqlService');
let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));

module.exports = async function checkDatabaseConfig(){
    const db_protocol = config.database;
    const db_address = config.database_adress;
    const db_port = config.database_port;

    if (db_protocol.length <= 0) {
        console.log(`\x1b[0;31m[ERROR]\x1b[0;30m Couldn't continue. Error_Code: No database-type entered.`);
        process.exit(9);
    }

    if (db_protocol.toUpperCase() === "SQLITE") return await sqliteService();
    if (db_protocol.toUpperCase() === "MYSQL" && db_address.length > 0 && db_port > 0) return await mysqlService(db_address, db_port);
}