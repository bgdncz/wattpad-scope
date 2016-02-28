/*
 * Copyright 2015 Canonical Ltd.
 *
 * This file is part of unity-js-scopes.
 *
 * unity-js-scopes is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; version 3.
 *
 * unity-js-scopes is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var lib = require('./unity_js_scopes_bindings');
var core = require('./lib/scope-core.js');

// Init the first time it is accessed
var self;

/**
 * Scope corresponds to the bridge between the ubuntu scope runtime
 * and the actual scope.
 * 
 * A Scope object is not directly constructible but it is automatically created
 * when the scope module is imported and is accessible through the 'self' exported
 * member.
 * 
 * After the scopes runtime has obtained initialization runtime configurations from
 * the scope, it calls start(), which allows the scope to intialize itself. This is
 * followed by a call to run().
 * 
 * When the scope should complete its activities, the runtime calls stop().
 * 
 * @example
      var scopes = require('unity-js-scopes')
      scopes.self
  
 * @module ScopeJS
 * 
 * 
 * @class Scope
 */
function Scope() {}

Scope.prototype = {
    /**
     * This member function is the entry point to setting up a scope's behavior
     * and configuring it to the runtime scope.
     *
     * @method initialize
     * @param options {Object} A dictionary of options for the scope runtime.
     *      The option keys are:
     *         - scope_id: the scope id
     * @param runtime_config {Object} A dictionary of runtime configuration settings for the scope runtime.
     *      The configuration keys are:
     *         - run {Function()}: Callback called by the scopes run time after it has called start() to hand a thread of control to the scope
     *         - starting {Function(String: scope_id)}: Callback called by the scopes run time after the create function completes
     *         - stop {Function()}: Callback called by the scopes run time when the scope should shut down
     *         - search {Function(CannedQuery: canned_query, SearchMetaData: metadata)}: Callback called by the scopes run time when a scope needs to instantiate a query
     *         - perform_action {Function(Result: result, ActionMetaData: metadata, String: widget_id, String: ation_id)}: Callback invoked when a scope is requested to handle a preview action
     *         - preview {Function(Result: result, ActionMetaData: metadata)}: Callback invoked when a scope is requested to create a preview for a particular result
     *
     * @example
              var scopes = require('unity-js-scopes')
              scopes.self.initialize(
                {}, {
                  run: function() {}
                  start: function(scope_id) {
                    console.log('Starting scope id: '
                      + scope_id
                      + ', '
                      + scopes.self.scope_config)
                  },
                  search: function(canned_query, metadata) {}
                }
              );
    */
    initialize: function(options, runtime_config) {
        this._setup_backend();

        if (! options || typeof(options) !== 'object') {
            throw "No or invalid options specified";
        }
        
        if (! runtime_config || typeof(runtime_config) !== 'object') {
            throw "No or invalid runtime configuration specified";
        }

        if (runtime_config.run && typeof(runtime_config.run) === 'function') {
            this._base.onrun(runtime_config.run);
        }

        if (runtime_config.start && typeof(runtime_config.start) === 'function') {
            this._base.onstart(runtime_config.start);
        }

        if (runtime_config.stop && typeof(runtime_config.stop) === 'function') {
            this._base.onstop(runtime_config.stop);
        }

        if (runtime_config.search && typeof(runtime_config.search) === 'function') {
            this._base.onsearch(runtime_config.search);
        }

        if (runtime_config.preview && typeof(runtime_config.preview) === 'function') {
            this._base.onpreview(runtime_config.preview);
        }

        if (runtime_config.activate && typeof(runtime_config.activate) === 'function') {
            // this._base.onactivate(runtime_config.activate);
        }

        return this._scope_binding.run(
            options && options.scope_id ? options.scope_id : "");
    },
    _setup_backend: function(options) {
        if (! this._scope_binding) {
            this._scope_binding = core.new_scope(options ? options.runtime_config : "");
            this._base = this._scope_binding.scope_base();
        }
    },
    /**
     * Returns the directory that stores the scope's configuration files and shared library    
     *
     * @property scope_directory
     */
    get scope_directory() {
        return this._base.scope_directory();
    },
    /**
     * Returns a directory that is (exclusively) writable for the scope
     *
     * @property cache_directory
     */
    get cache_directory() {
        return this._base.cache_directory();
    },
    /**
     * Returns a tmp directory that is (exclusively) writable for the scope
     * 
     * @property tmp_directory
     */
    get tmp_directory() {
        return this._base.tmp_directory();
    },
    /**
     * Returns the scope registry
     * 
     * @property registry
     */
    get registry() {
        return this._base.registry();
    },
    /**
     * Returns a dictionary with the scope's current settings
     * 
     * @property settings
     */
    get settings() {
        return this._base.settings();
    },
};

// results_ttl_type enumeration type
var ResultsTtlType = {
    None: 0,
    Small: 1,
    Medium: 2,
    Large: 3
}

ConnectivityStatus = {
    Unknown: "Unknown",
    Connected: "Connected",
    Disconnected: "Disconnected"
};

var VariantType = {
    Null: "Null",
    Int: "Int",
    Int64: "Int64",
    Bool: "Bool",
    String: "String",
    Double: "Double",
    Dict: "Dict",
    Array: "Array"
};

var PostLoginAction = {
    Unknown: "Unknown",
    DoNothing: "DoNothing",
    InvalidateResults: "InvalidateResults",
    ContinueActivation: "ContinueActivation"
};

var OperationInfo = {
    Code: {
        Unknown: 0,
        NoInternet: 1,
        PoorInternet: 2,
        NoLocationData: 3,
        InaccurateLocationData: 4,
        ResultsIncomplete: 5,
        DefaultSettingsUsed: 6,
        SettingsProblem: 7
    }
};

module.exports = {
    lib: lib,
    defs: {
        PostLoginAction: PostLoginAction,
        VariantType: VariantType,
        ConnectivityStatus: ConnectivityStatus,
        OperationInfo: OperationInfo
    }
}

Object.defineProperty(
    module.exports,
    "self",
    {
        get: function() {
            if (! self) {
                self = new Scope();
            }
            return self;
        },
    });

process.on('SIGTERM', function() {
  self._scope_binding.stop();
});
