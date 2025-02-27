#include "./cms.h"
#include "./pp.h"

/**
 * Maximum command line arguments number.
 */
#define JERRY_MAX_COMMAND_LINE_ARGS (16)

/**
 * Standalone Jerry exit codes.
 */
#define JERRY_STANDALONE_EXIT_CODE_OK   (0)
#define JERRY_STANDALONE_EXIT_CODE_FAIL (1)

/**
 * Context size of the SYNTAX_ERROR
 */
#define SYNTAX_ERROR_CONTEXT_SIZE 2

/**
 * Print usage and available options
 */
static void
print_help (char *name)
{
  printf ("Usage: %s [OPTION]... [FILE]...\n"
          "\n"
          "Options:\n"
          "  --log-level [0-3]\n"
          "  --mem-stats\n"
          "\n",
          name);
} /* print_help */


/**
 * Register a JavaScript function in the global object.
 */
static void
register_js_function (const char *name_p, /**< name of the function */
                      jerry_external_handler_t handler_p) /**< function callback */
{
  jerry_value_t result_val = jerryx_register_global (name_p, handler_p);

  if (jerry_value_is_exception (result_val))
  {
    jerry_log (JERRY_LOG_LEVEL_WARNING, "Warning: failed to register '%s' method.", name_p);
  }

  //TODO: Эта команда приводит к Aborted
  //jerry_value_free (result_val);
} /* register_js_function */

int main(int argc, char **argv)
{
  if (argc > JERRY_MAX_COMMAND_LINE_ARGS)
  {
    jerry_log (JERRY_LOG_LEVEL_ERROR,
               "Too many command line arguments. Current maximum is %d\n",
               JERRY_MAX_COMMAND_LINE_ARGS);

    return JERRY_STANDALONE_EXIT_CODE_FAIL;
  }

  const char *file_names[JERRY_MAX_COMMAND_LINE_ARGS];
  int i;
  int files_counter = 0;

  jerry_init_flag_t flags = JERRY_INIT_EMPTY;

  for (i = 1; i < argc; i++)
  {
    if (!strcmp ("-h", argv[i]) || !strcmp ("--help", argv[i]))
    {
      print_help (argv[0]);
      return JERRY_STANDALONE_EXIT_CODE_OK;
    }
    else if (!strcmp ("--mem-stats", argv[i]))
    {
      flags |= JERRY_INIT_MEM_STATS;
      jerry_log_set_level (JERRY_LOG_LEVEL_DEBUG);
    }
    else if (!strcmp ("--log-level", argv[i]))
    {
      if (++i < argc && strlen (argv[i]) == 1 && argv[i][0] >= '0' && argv[i][0] <= '3')
      {
        jerry_log_set_level (argv[i][0] - '0');
      }
      else
      {
        jerry_log (JERRY_LOG_LEVEL_ERROR, "Error: wrong format or invalid argument\n");
        return JERRY_STANDALONE_EXIT_CODE_FAIL;
      }
    }
    else
    {
      file_names[files_counter++] = argv[i];
    }
  }

  jerry_init (flags);

  register_js_function ("assert", jerryx_handler_assert);
  //register_js_function ("gc", jerryx_handler_gc);
  register_js_function ("print", jerryx_handler_print);
  register_js_function ("pp", cms_handler_pp);

  jerry_value_t ret_value = jerry_undefined ();
  int ret_code = JERRY_STANDALONE_EXIT_CODE_OK;

  if (files_counter == 0)
  {
    jerryx_repl (JERRY_ZSTR_ARG ("jerry> "));
  }
  else
  {
    for (i = 0; i < files_counter; i++)
    {
      ret_value = jerryx_source_exec_script (file_names[i]);
      if (jerry_value_is_exception (ret_value))
      {
        ret_code = JERRY_STANDALONE_EXIT_CODE_FAIL;
        jerryx_print_unhandled_exception (ret_value);
        break;
      }

      jerry_value_free (ret_value);
    }
  }

  ret_value = jerry_run_jobs ();

  if (jerry_value_is_exception (ret_value))
  {
    ret_code = JERRY_STANDALONE_EXIT_CODE_FAIL;
  }

  jerry_value_free (ret_value);
  jerry_cleanup ();

  return ret_code;
} /* main */
