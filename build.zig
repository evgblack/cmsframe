const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});

    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "cms",
        .target = target,
        .optimize = optimize,
    });

    exe.linkLibC();

    const c_flags = &[_][]const u8{
        //    "-std=c99",
        "-fno-sanitize=undefined",
        "-Wno-return-type-c-linkage",
    };

    const cms: []const u8 = "src/cms";
    const jerry: []const u8 = "src/jerry";
    const core: []const u8 = jerry ++ "/jerry-core";
    const api: []const u8 = core ++ "/api";
    const debugger: []const u8 = core ++ "/debugger";

    const ecma: []const u8 = core ++ "/ecma";
    const base: []const u8 = ecma ++ "/base";
    const operations: []const u8 = ecma ++ "/operations";
    const builtin: []const u8 = ecma ++ "/builtin-objects";
    const typedarray: []const u8 = builtin ++ "/typedarray";

    const jcontext: []const u8 = core ++ "/jcontext";
    const parser: []const u8 = core ++ "/parser";
    const p_regexp: []const u8 = parser ++ "/regexp";
    const p_js: []const u8 = parser ++ "/js";
    const jmem: []const u8 = core ++ "/jmem";
    const jrt: []const u8 = core ++ "/jrt";
    const lit: []const u8 = core ++ "/lit";
    const vm: []const u8 = core ++ "/vm";

    const ext: []const u8 = jerry ++ "/jerry-ext";
    const ext_include: []const u8 = ext ++ "/include";
    const ext_arg: []const u8 = ext ++ "/arg";
    const ext_common: []const u8 = ext ++ "/common";
    const ext_debugger: []const u8 = ext ++ "/debugger";
    const ext_handle_scope: []const u8 = ext ++ "/handle-scope";
    const ext_module: []const u8 = ext ++ "/module";
    const ext_util: []const u8 = ext ++ "/util";

    const j_port: []const u8 = jerry ++ "/jerry-port";
    const j_port_common: []const u8 = j_port ++ "/common";
    const j_port_unix: []const u8 = j_port ++ "/unix";
    //const j_win: []const u8 = j_port ++ "/win";

    //TODO : Настройки из config.h нужно будет перенести в build.zig

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            cms ++ "/cms.c",
            cms ++ "/pp.c",
        },
        .flags = c_flags,
    });

    exe.addIncludePath(b.path(core));
    exe.addIncludePath(b.path(api));
    exe.addIncludePath(b.path(debugger));
    exe.addIncludePath(b.path(core ++ "/include"));
    exe.addIncludePath(b.path(base));
    exe.addIncludePath(b.path(operations));
    exe.addIncludePath(b.path(builtin));
    exe.addIncludePath(b.path(typedarray));
    exe.addIncludePath(b.path(jcontext));
    exe.addIncludePath(b.path(parser));
    exe.addIncludePath(b.path(p_regexp));
    exe.addIncludePath(b.path(p_js));
    exe.addIncludePath(b.path(jmem));
    exe.addIncludePath(b.path(jrt));
    exe.addIncludePath(b.path(lit));
    exe.addIncludePath(b.path(vm));

    exe.addIncludePath(b.path(ext_include));
    exe.addIncludePath(b.path(ext_arg));
    exe.addIncludePath(b.path(ext_common));
    exe.addIncludePath(b.path(ext_debugger));
    exe.addIncludePath(b.path(ext_handle_scope));

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            ext_arg ++ "/arg.c",
            ext_arg ++ "/arg-js-iterator-helper.c",
            ext_arg ++ "/arg-transform-functions.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            ext_debugger ++ "/debugger-common.c",
            ext_debugger ++ "/debugger-rp.c",
            ext_debugger ++ "/debugger-serial.c",
            ext_debugger ++ "/debugger-sha1.c",
            ext_debugger ++ "/debugger-tcp.c",
            ext_debugger ++ "/debugger-ws.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            ext_handle_scope ++ "/handle-scope-allocator.c",
            ext_handle_scope ++ "/handle-scope.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            ext_module ++ "/module.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            ext_util ++ "/handlers.c",
            ext_util ++ "/properties.c",
            ext_util ++ "/sources.c",
            ext_util ++ "/print.c",
            ext_util ++ "/repl.c",
            ext_util ++ "/test262.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            j_port_common ++ "/jerry-port-context.c",
            j_port_common ++ "/jerry-port-fs.c",
            j_port_common ++ "/jerry-port-io.c",
            j_port_common ++ "/jerry-port-process.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            j_port_unix ++ "/jerry-port-unix-date.c",
            j_port_unix ++ "/jerry-port-unix-fs.c",
            j_port_unix ++ "/jerry-port-unix-process.c",
        },
        .flags = c_flags,
    });

    //exe.addCSourceFiles(.{
    //    .files = &[_][]const u8{
    //        j_win ++ "/jerry-port-win-date.c",
    //        j_win ++ "/jerry-port-win-fs.c",
    //        j_win ++ "/jerry-port-win-process.c",
    //    },
    //    .flags = c_flags,
    //});

    // /jerry-ext/util/handlers.c
    // /jerry-ext/util/print.c
    // /jerry-port/common/jerry-port-io.c

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            api ++ "/jerry-debugger.c",
            api ++ "/jerry-debugger-transport.c",
            api ++ "/jerry-module.c",
            api ++ "/jerryscript.c",
            api ++ "/jerry-snapshot.c",
            //api ++ "/jerry-snapshot.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            debugger ++ "/debugger.c",
            //debugger ++ "/debugger.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            base ++ "/ecma-alloc.c",
            //base ++ "/ecma-gc.h",
            //base ++ "/ecma-helpers-number.h",
            //base ++ "/ecma-helpers-number.h",
            base ++ "/ecma-literal-storage.c",
            //base ++ "/ecma-alloc.h",
            //base ++ "/ecma-globals.h",
            base ++ "/ecma-helpers-string.c",
            //base ++ "/ecma-literal-storage.h",
            //base ++ "/ecma-error-messages.inc.h",
            base ++ "/ecma-helpers.c",
            base ++ "/ecma-helpers-value.c",
            base ++ "/ecma-module.c",
            //base ++ "/ecma-error-messages.ini",
            base ++ "/ecma-helpers-collection.c",
            base ++ "/ecma-init-finalize.c",
            //base ++ "/ecma-module.h",
            base ++ "/ecma-errors.c",
            base ++ "/ecma-helpers-conversion.c",
            //base ++ "/ecma-init-finalize.h",
            base ++ "/ecma-property-hashmap.c",
            //base ++ "/ecma-errors.h",
            base ++ "/ecma-helpers-errol.c",
            base ++ "/ecma-lcache.c",
            //base ++ "/ecma-property-hashmap.h",
            base ++ "/ecma-extended-info.c",
            base ++ "/ecma-helpers-external-pointers.c",
            //base ++ "/ecma-lcache.h",
            //base ++ "/ecma-extended-info.h",
            //base ++ "/ecma-helpers.h",
            base ++ "/ecma-line-info.c",
            base ++ "/ecma-gc.c",
            base ++ "/ecma-helpers-number.c",
            //base ++ "/ecma-line-info.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            operations ++ "/ecma-arguments-object.c",
            //operations ++ "/ecma-function-object.h",
            //operations ++ "/ecma-arguments-object.h",
            operations ++ "/ecma-get-put-value.c",
            operations ++ "/ecma-arraybuffer-object.c",
            operations ++ "/ecma-iterator-object.c",
            //operations ++ "/ecma-arraybuffer-object.h",
            //operations ++ "/ecma-iterator-object.h",
            operations ++ "/ecma-array-object.c",
            operations ++ "/ecma-jobqueue.c",
            //operations ++ "/ecma-array-object.h",
            //operations ++ "/ecma-jobqueue.h",
            operations ++ "/ecma-async-generator-object.c",
            operations ++ "/ecma-lex-env.c",
            //operations ++ "/ecma-async-generator-object.h",
            //operations ++ "/ecma-lex-env.h",
            operations ++ "/ecma-atomics-object.c",
            operations ++ "/ecma-number-object.c",
            //operations ++ "/ecma-atomics-object.h",
            //operations ++ "/ecma-number-object.h",
            operations ++ "/ecma-bigint.c",
            operations ++ "/ecma-objects.c",
            //operations ++ "/ecma-bigint.h",
            operations ++ "/ecma-objects-general.c",
            operations ++ "/ecma-bigint-object.c",
            //operations ++ "/ecma-objects-general.h",
            //operations ++ "/ecma-bigint-object.h",
            //operations ++ "/ecma-objects.h",
            operations ++ "/ecma-big-uint.c",
            operations ++ "/ecma-promise-object.c",
            //operations ++ "/ecma-big-uint.h",
            //operations ++ "/ecma-promise-object.h",
            operations ++ "/ecma-boolean-object.c",
            operations ++ "/ecma-proxy-object.c",
            //operations ++ "/ecma-boolean-object.h",
            //operations ++ "/ecma-proxy-object.h",
            operations ++ "/ecma-comparison.c",
            operations ++ "/ecma-reference.c",
            //operations ++ "/ecma-comparison.h",
            //operations ++ "/ecma-reference.h",
            operations ++ "/ecma-container-object.c",
            operations ++ "/ecma-regexp-object.c",
            //operations ++ "/ecma-container-object.h",
            //operations ++ "/ecma-regexp-object.h",
            operations ++ "/ecma-conversion.c",
            operations ++ "/ecma-shared-arraybuffer-object.c",
            //operations ++ "/ecma-conversion.h",
            //operations ++ "/ecma-shared-arraybuffer-object.h",
            operations ++ "/ecma-dataview-object.c",
            operations ++ "/ecma-string-object.c",
            //operations ++ "/ecma-dataview-object.h",
            //operations ++ "/ecma-string-object.h",
            operations ++ "/ecma-eval.c",
            operations ++ "/ecma-symbol-object.c",
            //operations ++ "/ecma-eval.h",
            //operations ++ "/ecma-symbol-object.h",
            operations ++ "/ecma-exceptions.c",
            operations ++ "/ecma-typedarray-object.c",
            //operations ++ "/ecma-exceptions.h",
            //operations ++ "/ecma-typedarray-object.h",
            operations ++ "/ecma-function-object.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            builtin ++ "/ecma-builtin-aggregateerror.c",
            builtin ++ "/ecma-builtin-aggregateerror-prototype.c",
            builtin ++ "/ecma-builtin-arraybuffer.c",
            builtin ++ "/ecma-builtin-arraybuffer-prototype.c",
            builtin ++ "/ecma-builtin-array.c",
            builtin ++ "/ecma-builtin-array-iterator-prototype.c",
            builtin ++ "/ecma-builtin-array-prototype.c",
            builtin ++ "/ecma-builtin-array-prototype-unscopables.c",
            builtin ++ "/ecma-builtin-async-from-sync-iterator-prototype.c",
            builtin ++ "/ecma-builtin-async-function.c",
            builtin ++ "/ecma-builtin-async-function-prototype.c",
            builtin ++ "/ecma-builtin-async-generator.c",
            builtin ++ "/ecma-builtin-async-generator-function.c",
            builtin ++ "/ecma-builtin-async-generator-prototype.c",
            builtin ++ "/ecma-builtin-async-iterator-prototype.c",
            builtin ++ "/ecma-builtin-atomics.c",
            builtin ++ "/ecma-builtin-bigint.c",
            builtin ++ "/ecma-builtin-bigint-prototype.c",
            builtin ++ "/ecma-builtin-boolean.c",
            builtin ++ "/ecma-builtin-boolean-prototype.c",
            builtin ++ "/ecma-builtin-dataview.c",
            builtin ++ "/ecma-builtin-dataview-prototype.c",
            builtin ++ "/ecma-builtin-date.c",
            builtin ++ "/ecma-builtin-date-prototype.c",
            builtin ++ "/ecma-builtin-error.c",
            builtin ++ "/ecma-builtin-error-prototype.c",
            builtin ++ "/ecma-builtin-evalerror.c",
            builtin ++ "/ecma-builtin-evalerror-prototype.c",
            builtin ++ "/ecma-builtin-function.c",
            builtin ++ "/ecma-builtin-function-prototype.c",
            builtin ++ "/ecma-builtin-generator.c",
            builtin ++ "/ecma-builtin-generator-function.c",
            builtin ++ "/ecma-builtin-generator-prototype.c",
            builtin ++ "/ecma-builtin-global.c",
            builtin ++ "/ecma-builtin-handlers.c",
            builtin ++ "/ecma-builtin-helpers.c",
            builtin ++ "/ecma-builtin-helpers-date.c",
            builtin ++ "/ecma-builtin-helpers-error.c",
            builtin ++ "/ecma-builtin-helpers-json.c",
            builtin ++ "/ecma-builtin-helpers-sort.c",
            builtin ++ "/ecma-builtin-intrinsic.c",
            builtin ++ "/ecma-builtin-iterator-prototype.c",
            builtin ++ "/ecma-builtin-json.c",
            builtin ++ "/ecma-builtin-map.c",
            builtin ++ "/ecma-builtin-map-iterator-prototype.c",
            builtin ++ "/ecma-builtin-map-prototype.c",
            builtin ++ "/ecma-builtin-math.c",
            builtin ++ "/ecma-builtin-number.c",
            builtin ++ "/ecma-builtin-number-prototype.c",
            builtin ++ "/ecma-builtin-object.c",
            builtin ++ "/ecma-builtin-object-prototype.c",
            builtin ++ "/ecma-builtin-promise.c",
            builtin ++ "/ecma-builtin-promise-prototype.c",
            builtin ++ "/ecma-builtin-proxy.c",
            builtin ++ "/ecma-builtin-rangeerror.c",
            builtin ++ "/ecma-builtin-rangeerror-prototype.c",
            builtin ++ "/ecma-builtin-referenceerror.c",
            builtin ++ "/ecma-builtin-referenceerror-prototype.c",
            builtin ++ "/ecma-builtin-reflect.c",
            builtin ++ "/ecma-builtin-regexp.c",
            builtin ++ "/ecma-builtin-regexp-prototype.c",
            builtin ++ "/ecma-builtin-regexp-string-iterator-prototype.c",
            builtin ++ "/ecma-builtins.c",
            builtin ++ "/ecma-builtin-set.c",
            builtin ++ "/ecma-builtin-set-iterator-prototype.c",
            builtin ++ "/ecma-builtin-set-prototype.c",
            builtin ++ "/ecma-builtin-shared-arraybuffer.c",
            builtin ++ "/ecma-builtin-shared-arraybuffer-prototype.c",
            builtin ++ "/ecma-builtin-string.c",
            builtin ++ "/ecma-builtin-string-iterator-prototype.c",
            builtin ++ "/ecma-builtin-string-prototype.c",
            builtin ++ "/ecma-builtin-symbol.c",
            builtin ++ "/ecma-builtin-symbol-prototype.c",
            builtin ++ "/ecma-builtin-syntaxerror.c",
            builtin ++ "/ecma-builtin-syntaxerror-prototype.c",
            builtin ++ "/ecma-builtin-typeerror.c",
            builtin ++ "/ecma-builtin-typeerror-prototype.c",
            builtin ++ "/ecma-builtin-type-error-thrower.c",
            builtin ++ "/ecma-builtin-urierror.c",
            builtin ++ "/ecma-builtin-urierror-prototype.c",
            builtin ++ "/ecma-builtin-weakmap.c",
            builtin ++ "/ecma-builtin-weakmap-prototype.c",
            builtin ++ "/ecma-builtin-weakref.c",
            builtin ++ "/ecma-builtin-weakref-prototype.c",
            builtin ++ "/ecma-builtin-weakset.c",
            builtin ++ "/ecma-builtin-weakset-prototype.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            typedarray ++ "/ecma-builtin-bigint64array.c",
            //typedarray ++ "/ecma-builtin-bigint64array.inc.h",
            typedarray ++ "/ecma-builtin-bigint64array-prototype.c",
            //typedarray ++ "/ecma-builtin-bigint64array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-biguint64array.c",
            //typedarray ++ "/ecma-builtin-biguint64array.inc.h",
            typedarray ++ "/ecma-builtin-biguint64array-prototype.c",
            //typedarray ++ "/ecma-builtin-biguint64array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-float32array.c",
            //typedarray ++ "/ecma-builtin-float32array.inc.h",
            typedarray ++ "/ecma-builtin-float32array-prototype.c",
            //typedarray ++ "/ecma-builtin-float32array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-float64array.c",
            //typedarray ++ "/ecma-builtin-float64array.inc.h",
            typedarray ++ "/ecma-builtin-float64array-prototype.c",
            //typedarray ++ "/ecma-builtin-float64array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-int16array.c",
            //typedarray ++ "/ecma-builtin-int16array.inc.h",
            typedarray ++ "/ecma-builtin-int16array-prototype.c",
            //typedarray ++ "/ecma-builtin-int16array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-int32array.c",
            //typedarray ++ "/ecma-builtin-int32array.inc.h",
            typedarray ++ "/ecma-builtin-int32array-prototype.c",
            //typedarray ++ "/ecma-builtin-int32array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-int8array.c",
            //typedarray ++ "/ecma-builtin-int8array.inc.h",
            typedarray ++ "/ecma-builtin-int8array-prototype.c",
            //typedarray ++ "/ecma-builtin-int8array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-typedarray.c",
            typedarray ++ "/ecma-builtin-typedarray-helpers.c",
            //typedarray ++ "/ecma-builtin-typedarray-helpers.h",
            //typedarray ++ "/ecma-builtin-typedarray.inc.h",
            typedarray ++ "/ecma-builtin-typedarray-prototype.c",
            //typedarray ++ "/ecma-builtin-typedarray-prototype.inc.h",
            //typedarray ++ "/ecma-builtin-typedarray-prototype-template.inc.h",
            //typedarray ++ "/ecma-builtin-typedarray-template.inc.h",
            typedarray ++ "/ecma-builtin-uint16array.c",
            //typedarray ++ "/ecma-builtin-uint16array.inc.h",
            typedarray ++ "/ecma-builtin-uint16array-prototype.c",
            //typedarray ++ "/ecma-builtin-uint16array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-uint32array.c",
            //typedarray ++ "/ecma-builtin-uint32array.inc.h",
            typedarray ++ "/ecma-builtin-uint32array-prototype.c",
            //typedarray ++ "/ecma-builtin-uint32array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-uint8array.c",
            //typedarray ++ "/ecma-builtin-uint8array.inc.h",
            typedarray ++ "/ecma-builtin-uint8array-prototype.c",
            //typedarray ++ "/ecma-builtin-uint8array-prototype.inc.h",
            typedarray ++ "/ecma-builtin-uint8clampedarray.c",
            //typedarray ++ "/ecma-builtin-uint8clampedarray.inc.h",
            typedarray ++ "/ecma-builtin-uint8clampedarray-prototype.c",
            //typedarray ++ "/ecma-builtin-uint8clampedarray-prototype.inc.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            jcontext ++ "/jcontext.c",
            //jcontext ++ "/jcontext.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            p_regexp ++ "/re-bytecode.c",
            //p_regexp ++ "/re-bytecode.h",
            p_regexp ++ "/re-compiler.c",
            //p_regexp ++ "/re-compiler-context.h",
            //p_regexp ++ "/re-compiler.h",
            p_regexp ++ "/re-parser.c",
            //p_regexp ++ "/re-parser.h",
            //p_regexp ++ "/re-token.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            p_js ++ "/byte-code.c",
            //p_js ++ "/byte-code.h",
            p_js ++ "/common.c",
            //p_js ++ "/common.h",
            p_js ++ "/js-lexer.c",
            //p_js ++ "/js-lexer.h",
            p_js ++ "/js-parser.c",
            p_js ++ "/js-parser-expr.c",
            //p_js ++ "/js-parser.h",
            //p_js ++ "/js-parser-internal.h",
            //p_js ++ "/js-parser-limits.h",
            p_js ++ "/js-parser-line-info-create.c",
            p_js ++ "/js-parser-mem.c",
            p_js ++ "/js-parser-module.c",
            p_js ++ "/js-parser-statm.c",
            p_js ++ "/js-parser-tagged-template-literal.c",
            //p_js ++ "/js-parser-tagged-template-literal.h",
            p_js ++ "/js-parser-util.c",
            p_js ++ "/js-scanner.c",
            //p_js ++ "/js-scanner.h",
            //p_js ++ "/js-scanner-internal.h",
            p_js ++ "/js-scanner-ops.c",
            p_js ++ "/js-scanner-util.c",
            //p_js ++ "/parser-error-messages.inc.h",
            //p_js ++ "/parser-error-messages.ini",
            p_js ++ "/parser-errors.c",
            //p_js ++ "/parser-errors.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            jmem ++ "/jmem-allocator.c",
            //jmem ++ "/jmem-allocator-internal.h",
            //jmem ++ "/jmem.h",
            jmem ++ "/jmem-heap.c",
            jmem ++ "/jmem-poolman.c",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            //jrt ++ "/jrt-bit-fields.h",
            jrt ++ "/jrt-fatals.c",
            //jrt ++ "/jrt.h",
            //jrt ++ "/jrt-libc-includes.h",
            jrt ++ "/jrt-logging.c",
            //jrt ++ "/jrt-types.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            lit ++ "/lit-char-helpers.c",
            //lit ++ "/lit-char-helpers.h",
            //lit ++ "/lit-globals.h",
            lit ++ "/lit-magic-strings.c",
            //lit ++ "/lit-magic-strings.h",
            //lit ++ "/lit-magic-strings.inc.h",
            //lit ++ "/lit-magic-strings.ini",
            lit ++ "/lit-strings.c",
            //lit ++ "/lit-strings.h",
            //lit ++ "/lit-unicode-conversions.inc.h",
            //lit ++ "/lit-unicode-conversions-sup.inc.h",
            //lit ++ "/lit-unicode-folding.inc.h",
            //lit ++ "/lit-unicode-ranges.inc.h",
            //lit ++ "/lit-unicode-ranges-sup.inc.h",
        },
        .flags = c_flags,
    });

    exe.addCSourceFiles(.{
        .files = &[_][]const u8{
            vm ++ "/opcodes.c",
            vm ++ "/opcodes-ecma-arithmetics.c",
            vm ++ "/opcodes-ecma-bitwise.c",
            vm ++ "/opcodes-ecma-relational-equality.c",
            //vm ++ "/opcodes.h",
            vm ++ "/vm.c",
            //vm ++ "/vm-defines.h",
            //vm ++ "/vm.h",
            vm ++ "/vm-stack.c",
            //vm ++ "/vm-stack.h",
            vm ++ "/vm-utils.c",
        },
        .flags = c_flags,
    });

    b.installArtifact(exe);
}
