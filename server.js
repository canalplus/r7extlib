'use strict';
var express = require('express');
var winston = require('winston');
var app = express();

app.use(express.static(__dirname + '/samples/basic'));

app.listen(3000, '192.168.0.29', () => winston.info('PROXY SERVER LAUNCHED ON', 3000));
