module.exports = Environment;

Environment.prototype.addValidator = addValidator;
Environment.prototype.addType = addType;
Environment.prototype.addFormat = addFormat;
Environment.prototype.addTypeSchema = addTypeSchema;
Environment.prototype.addTypeCoerce = addTypeCoerce;
Environment.prototype.addVariable = addVariable;

Environment.prototype.compile = compile;
Environment.prototype.validate = validate;

var injector = require('./injector');
var Schema = require('./schema');
var Compiler = require('./compiler');
var uid = require('./uid');

function Environment() {
	this.validators = {};
	this.formats = {};
	this.validatorsType = {};
	this.variables = {};
	this.compiled = {};
	this.typeCoerce = {};
}

function compile(schema, root) {
	if (schema.__schema) {
		return schema.__schema;
	}

	var compiler = new Compiler(schema, this);
	var fn = compiler.compile();

	schema.__schema = new Schema(fn, schema, this, root);

	if (schema.id) {
		this.compiled[schema.id] = schema.__schema;
	}

	return schema.__schema;
}

function validate(schema, data) {
	return this.compile(schema).validate(data);
}

function addValidator(property, fn) {
	var key = property;

	if (typeof fn == 'string') {
		this.validators[key] = fn;
	} else {
		this.validators[key] = injector(fn);
	}
}

function addType(type, fn) {
	this.validatorsType[type] = injector(fn);
}

function addTypeCoerce(type, fn) {
	this.typeCoerce[type] = fn;
}

function addFormat(format, fn) {
	this.formats[format] = injector(fn);
}

function addTypeSchema(schema) {
	var id = schema.id;
	var key = uid('__v');

	var text = [
		'if (!typeOk) {',
		'	var %key% = this.env.compiled["%id%"];',
		'	%key%.__validate(value);',
		'	typeOk = !%key%.errors.length;',
		'	if (!typeOk) {',
		'		typeError.push("%id%")',
		'	}',
		'}',
	].join('\n')
	.replace(/%key%/g, key)
	.replace(/%id%/g, id);

	this.validatorsType['schema#' + id] = {
		text: text,
		args: ['typeOk', 'parent', 'property', 'typeError']
	};
}

function addVariable(property, fn) {
	this.variables[property] = injector(fn || fnVoid);
}

function fnVoid() {}
