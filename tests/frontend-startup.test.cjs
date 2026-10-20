const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const environment = {
  VITE_FIREBASE_API_KEY: 'test-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-digipus.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-digipus',
  VITE_FIREBASE_DATABASE_URL: 'https://demo-digipus.firebaseio.com',
};

test('registration forwards the supplied password to Firebase account creation', async () => {
  const source = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
  const tree = ts.createSourceFile('AuthContext.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let register;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'register') register = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(register, 'registration function exists');
  const code = ts.transpileModule(`const register = ${register.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const auth = {};
  const stop = new Error('stop before external account creation');
  let argumentsReceived;
  const context = {
    auth,
    createUserWithEmailAndPassword: async (...args) => {
      argumentsReceived = args;
      throw stop;
    },
  };
  vm.runInNewContext(`${code}\nglobalThis.register = register;`, context);
  await assert.rejects(context.register('reader@example.invalid', 'test-only-password', {
    nama: 'Test Reader', username: 'test-reader',
  }), error => error === stop);
  assert.deepEqual(argumentsReceived, [auth, 'reader@example.invalid', 'test-only-password']);
});

function initialize(overrides) {
  const calls = [];
  const source = fs.readFileSync('src/lib/firebase.ts', 'utf8').replaceAll('import.meta.env', 'environment');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = {
    environment: { ...environment, ...overrides },
    exports: {},
    require: () => Object.fromEntries(['initializeApp', 'getAuth', 'getDatabase'].map(name => [name, argument => {
      calls.push({ name, argument });
      return name;
    }])),
  };
  return { calls, run: () => vm.runInNewContext(code, context), exports: context.exports };
}

test('missing or blank Firebase configuration fails clearly before SDK initialization', () => {
  for (const name of Object.keys(environment)) {
    for (const value of [undefined, '', '   ']) {
      const attempt = initialize({ [name]: value });
      assert.throws(attempt.run, new RegExp(name + '.*\\.env'));
      assert.equal(attempt.calls.length, 0);
    }
  }
});

test('configured startup uses only Spark Auth and Database services', () => {
  const attempt = initialize({});
  attempt.run();
  assert.deepEqual(attempt.calls.map(call => call.name), ['initializeApp', 'getAuth', 'getDatabase']);
  assert.equal(attempt.calls[0].argument.projectId, environment.VITE_FIREBASE_PROJECT_ID);
  assert.equal(attempt.calls[0].argument.databaseURL, environment.VITE_FIREBASE_DATABASE_URL);
  assert.deepEqual(attempt.exports, { auth: 'getAuth', db: 'getDatabase' });
});

test('error messages accept native and serialized errors while retaining the caller fallback', () => {
  const context = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/errors.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, context);
  const { getErrorMessage } = context.exports;
  assert.equal(getErrorMessage(new Error('failed')), 'failed');
  assert.equal(getErrorMessage({ message: 'serialized' }), 'serialized');
  assert.equal(getErrorMessage('text'), 'text');
  for (const error of [null, undefined, {}, { message: '' }, { message: 123 }]) assert.equal(getErrorMessage(error, 'fallback'), 'fallback');
});
