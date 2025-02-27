#include <assert.h>
#include <inttypes.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#include "./pp.h"

/**
 * Assert that it is correct to call API in current state.
 *
 * Note:
 *         By convention, there are some states when API could not be invoked.
 *
 *         The API can be and only be invoked when the ECMA_STATUS_API_ENABLED
 *         flag is set.
 *
 *         This procedure checks whether the API is available, and terminates
 *         the engine if it is unavailable. Otherwise it is a no-op.
 *
 * Note:
 *         The API could not be invoked in the following cases:
 *           - before jerry_init and after jerry_cleanup
 *           - between enter to and return from a native free callback
 */
static inline void JERRY_ATTR_ALWAYS_INLINE
cms_assert_api_enabled (void)
{
  JERRY_ASSERT (JERRY_CONTEXT (status_flags) & ECMA_STATUS_API_ENABLED);
} /* cms_assert_api_enabled */



/**
 * Provide a 'print' implementation for scripts.
 *
 * The routine converts all of its arguments to strings and outputs them
 * by using jerry_port_print_buffer.
 *
 * The NULL character is output as "\u0000", other characters are output
 * bytewise.
 *
 * @return undefined - if all arguments could be converted to strings,
 *         error - otherwise.
 */
jerry_value_t
cms_handler_pp (const jerry_call_info_t *call_info_p, /**< call information */
                      const jerry_value_t args_p[], /**< function arguments */
                      const jerry_length_t args_cnt) /**< number of function arguments */
{
  (void) call_info_p; /* unused */

  for (jerry_length_t index = 0; index < args_cnt; index++)
  {
    if (index > 0)
    {
      cms_pp_buffer (JERRY_ZSTR_ARG (" "));
    }

    jerry_value_t result = cms_pp_value (args_p[index]);

    if (jerry_value_is_exception (result))
    {
      return result;
    }
  }

  cms_pp_buffer (JERRY_ZSTR_ARG ("\n"));
  return jerry_undefined ();
} /* jerryx_handler_print */


/* Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Print buffer size
 */
#define CMS_PRINT_BUFFER_SIZE 64

/**
 * Max line size that will be printed on a Syntax Error
 */
#define CMS_SYNTAX_ERROR_MAX_LINE_LENGTH 256

/**
 * Struct for buffering print output
 */
typedef struct
{
  jerry_size_t index; /**< write index */
  jerry_char_t data[CMS_PRINT_BUFFER_SIZE]; /**< buffer data */
} cms_pp_buffer_t;

/**
 * Callback used by cms_pp_value to batch written characters and print them in bulk.
 * NULL bytes are escaped and written as '\u0000'.
 *
 * @param value:  encoded byte value
 * @param user_p: user pointer
 */
static void
buffered_print (uint32_t value, void *user_p)
{
  cms_pp_buffer_t *buffer_p = (cms_pp_buffer_t *) user_p;

  if (value == '\0')
  {
    cms_pp_buffer (buffer_p->data, buffer_p->index);
    buffer_p->index = 0;

    cms_pp_buffer (JERRY_ZSTR_ARG ("\\u0000"));
    return;
  }

  assert (value <= UINT8_MAX);
  buffer_p->data[buffer_p->index++] = (uint8_t) value;

  if (buffer_p->index >= CMS_PRINT_BUFFER_SIZE)
  {
    cms_pp_buffer (buffer_p->data, buffer_p->index);
    buffer_p->index = 0;
  }
} /* buffered_print */

/**
 * Convert a value to string and print it to standard output.
 * NULL characters are escaped to "\u0000", other characters are output as-is.
 *
 * @param value: input value
 */
jerry_value_t
cms_pp_value (const jerry_value_t value)
{
  jerry_value_t string;

  if (jerry_value_is_symbol (value))
  {
    string = jerry_symbol_descriptive_string (value);
  }
  else
  {
    string = cms_value_to_string (value);

    if (jerry_value_is_exception (string))
    {
      return string;
    }
  }

  cms_pp_buffer_t buffer;
  buffer.index = 0;

  jerry_string_iterate (string, JERRY_ENCODING_UTF8, &buffered_print, &buffer);
  jerry_value_free (string);

  cms_pp_buffer (buffer.data, buffer.index);

  return jerry_undefined ();
} /* cms_pp_value */

/**
 * Print a buffer to standard output.
 *
 * @param buffer_p: inptut string buffer
 * @param buffer_size: size of the string
 */
void
cms_pp_buffer (const jerry_char_t *buffer_p, jerry_size_t buffer_size)
{
  jerry_port_print_buffer (buffer_p, buffer_size);
} /* cms_pp_buffer */

/**
 * Print backtrace as log messages up to a specific depth.
 *
 * @param depth: backtrace depth
 */
void
cms_pp_backtrace (unsigned depth)
{
  if (!jerry_feature_enabled (JERRY_FEATURE_LINE_INFO))
  {
    return;
  }

  jerry_log (JERRY_LOG_LEVEL_ERROR, "Script backtrace (top %u):\n", depth);

  jerry_value_t backtrace_array = jerry_backtrace (depth);
  unsigned array_length = jerry_array_length (backtrace_array);

  for (unsigned idx = 0; idx < array_length; idx++)
  {
    jerry_value_t property = jerry_object_get_index (backtrace_array, idx);

    jerry_char_t buffer[CMS_PRINT_BUFFER_SIZE];

    jerry_size_t copied = jerry_string_to_buffer (property, JERRY_ENCODING_UTF8, buffer, CMS_PRINT_BUFFER_SIZE - 1);
    buffer[copied] = '\0';

    jerry_log (JERRY_LOG_LEVEL_ERROR, " %u: %s\n", idx, buffer);
    jerry_value_free (property);
  }

  jerry_value_free (backtrace_array);
} /* cms_pp_backtrace */

/**
 * Print an unhandled exception value
 *
 * The function will take ownership of the value, and free it.
 *
 * @param exception: unhandled exception value
 */
void
cms_pp_unhandled_exception (jerry_value_t exception) /**< exception value */
{
  assert (jerry_value_is_exception (exception));
  jerry_value_t value = jerry_exception_value (exception, true);

  JERRY_VLA (jerry_char_t, buffer_p, CMS_PRINT_BUFFER_SIZE);

  jerry_value_t string = jerry_value_to_string (value);

  jerry_size_t copied = jerry_string_to_buffer (string, JERRY_ENCODING_UTF8, buffer_p, CMS_PRINT_BUFFER_SIZE - 1);
  buffer_p[copied] = '\0';

  if (jerry_feature_enabled (JERRY_FEATURE_ERROR_MESSAGES) && jerry_error_type (value) == JERRY_ERROR_SYNTAX)
  {
    jerry_char_t *string_end_p = buffer_p + copied;
    jerry_size_t err_line = 0;
    jerry_size_t err_col = 0;
    char *path_str_p = NULL;
    char *path_str_end_p = NULL;

    /* 1. parse column and line information */
    for (jerry_char_t *current_p = buffer_p; current_p < string_end_p; current_p++)
    {
      if (*current_p == '[')
      {
        current_p++;

        if (*current_p == '<')
        {
          break;
        }

        path_str_p = (char *) current_p;
        while (current_p < string_end_p && *current_p != ':')
        {
          current_p++;
        }

        path_str_end_p = (char *) current_p;

        if (current_p == string_end_p)
        {
          break;
        }

        err_line = (unsigned int) strtol ((char *) current_p + 1, (char **) &current_p, 10);

        if (current_p == string_end_p)
        {
          break;
        }

        err_col = (unsigned int) strtol ((char *) current_p + 1, NULL, 10);
        break;
      }
    } /* for */

    if (err_line > 0 && err_col > 0 && err_col < CMS_SYNTAX_ERROR_MAX_LINE_LENGTH)
    {
      /* Temporarily modify the error message, so we can use the path. */
      *path_str_end_p = '\0';

      jerry_size_t source_size;
      jerry_char_t *source_p = jerry_port_source_read (path_str_p, &source_size);

      /* Revert the error message. */
      *path_str_end_p = ':';

      if (source_p != NULL)
      {
        uint32_t curr_line = 1;
        jerry_size_t pos = 0;

        /* 2. seek and print */
        while (pos < source_size && curr_line < err_line)
        {
          if (source_p[pos] == '\n')
          {
            curr_line++;
          }

          pos++;
        }

        /* Print character if:
         * - The max line length is not reached.
         * - The current position is valid (it is not the end of the source).
         * - The current character is not a newline.
         **/
        for (uint32_t char_count = 0;
             (char_count < CMS_SYNTAX_ERROR_MAX_LINE_LENGTH) && (pos < source_size) && (source_p[pos] != '\n');
             char_count++, pos++)
        {
          jerry_log (JERRY_LOG_LEVEL_ERROR, "%c", source_p[pos]);
        }

        jerry_log (JERRY_LOG_LEVEL_ERROR, "\n");
        jerry_port_source_free (source_p);

        while (--err_col)
        {
          jerry_log (JERRY_LOG_LEVEL_ERROR, "~");
        }

        jerry_log (JERRY_LOG_LEVEL_ERROR, "^\n\n");
      }
    }
  }

  jerry_log (JERRY_LOG_LEVEL_ERROR, "Unhandled exception: %s\n", buffer_p);
  jerry_value_free (string);

  if (jerry_value_is_object (value))
  {
    jerry_value_t backtrace_val = jerry_object_get_sz (value, "stack");

    if (jerry_value_is_array (backtrace_val))
    {
      uint32_t length = jerry_array_length (backtrace_val);

      /* This length should be enough. */
      if (length > 32)
      {
        length = 32;
      }

      for (unsigned i = 0; i < length; i++)
      {
        jerry_value_t item_val = jerry_object_get_index (backtrace_val, i);

        if (jerry_value_is_string (item_val))
        {
          copied = jerry_string_to_buffer (item_val, JERRY_ENCODING_UTF8, buffer_p, CMS_PRINT_BUFFER_SIZE - 1);
          buffer_p[copied] = '\0';

          jerry_log (JERRY_LOG_LEVEL_ERROR, " %u: %s\n", i, buffer_p);
        }

        jerry_value_free (item_val);
      }
    }

    jerry_value_free (backtrace_val);
  }

  jerry_value_free (value);
} /* cms_pp_unhandled_exception */

/**
 * Print unhandled promise rejection.
 *
 * @param result: promise rejection result
 */
void
cms_pp_unhandled_rejection (jerry_value_t result) /**< result value */
{
  jerry_value_t reason = jerry_value_to_string (result);

  if (!jerry_value_is_exception (reason))
  {
    JERRY_VLA (jerry_char_t, buffer_p, CMS_PRINT_BUFFER_SIZE);
    jerry_size_t copied = jerry_string_to_buffer (reason, JERRY_ENCODING_UTF8, buffer_p, CMS_PRINT_BUFFER_SIZE - 1);
    buffer_p[copied] = '\0';

    jerry_log (JERRY_LOG_LEVEL_WARNING, "Uncaught Promise rejection: %s\n", buffer_p);
  }
  else
  {
    jerry_log (JERRY_LOG_LEVEL_WARNING, "Uncaught Promise rejection: (reason cannot be converted to string)\n");
  }

  jerry_value_free (reason);
} /* cms_pp_unhandled_rejection */


jerry_value_t
cms_value_to_string (const jerry_value_t value) /**< input value */
{
  cms_assert_api_enabled ();

  if (ecma_is_value_exception (value))
  {
    return jerry_throw_sz (JERRY_ERROR_TYPE, ecma_get_error_msg (ECMA_ERR_VALUE_MSG));
  }

  ecma_string_t *str_p = cms_op_to_string (value);
  if (JERRY_UNLIKELY (str_p == NULL))
  {
    return ecma_create_exception_from_context ();
  }

  return ecma_make_string_value (str_p);
}

ecma_string_t *
cms_op_to_string (ecma_value_t value) /**< ecma value */
{
  ecma_check_value_type_is_spec_defined (value);

  if (ecma_is_value_string (value))
  {
    ecma_string_t *res_p = ecma_get_string_from_value (value);
    ecma_ref_ecma_string (res_p);
    return res_p;
  }

  if (ecma_is_value_integer_number (value))
  {
    ecma_integer_value_t num = ecma_get_integer_from_value (value);

    if (num < 0)
    {
      return ecma_new_ecma_string_from_number ((ecma_number_t) num);
    }
    else
    {
      return ecma_new_ecma_string_from_uint32 ((uint32_t) num);
    }
  }

  if (ecma_is_value_float_number (value))
  {
    ecma_number_t num = ecma_get_float_from_value (value);
    return ecma_new_ecma_string_from_number (num);
  }

  if (ecma_is_value_undefined (value))
  {
    return ecma_get_magic_string (LIT_MAGIC_STRING_UNDEFINED);
  }

  if (ecma_is_value_null (value))
  {
    return ecma_get_magic_string (LIT_MAGIC_STRING_NULL);
  }

  if (ecma_is_value_true (value))
  {
    return ecma_get_magic_string (LIT_MAGIC_STRING_TRUE);
  }

  if (ecma_is_value_false (value))
  {
    return ecma_get_magic_string (LIT_MAGIC_STRING_FALSE);
  }

  if (ecma_is_value_symbol (value))
  {
    ecma_raise_type_error (ECMA_ERR_CONVERT_SYMBOL_TO_STRING);
    return NULL;
  }

#if JERRY_BUILTIN_BIGINT
  if (ecma_is_value_bigint (value))
  {
    return ecma_bigint_to_string (value, 10);
  }
#endif /* JERRY_BUILTIN_BIGINT */

  JERRY_ASSERT (ecma_is_value_object (value));

  //printf(">*> TODO : pp Object\n");

  //ecma_object_t *obj_p = ecma_get_object_from_value (value);

//  jerry_value_t
//jerry_json_stringify (const jerry_value_t input_value)

  //jerry_value_t value = jerry_json_stringify(obj_p);

  /*
  //TODO : заменить на ecma_builtin_json_stringify
  ecma_value_t def_value = ecma_op_object_default_value (obj_p, ECMA_PREFERRED_TYPE_STRING);

  if (ECMA_IS_VALUE_ERROR (def_value))
  {
    return NULL;
  }

  ecma_string_t *ret_string_p = ecma_op_to_string (def_value);

  ecma_free_value (def_value);

  return ret_string_p;
  */

  //if (ecma_is_value_exception (value))
  //{
  //  return jerry_throw_sz (JERRY_ERROR_TYPE, ecma_get_error_msg (ECMA_ERR_VALUE_MSG));
  //}

  ecma_value_t ret_value = ecma_builtin_json_stringify_no_opts (value);

  if (ecma_is_value_undefined (ret_value))
  {
    ret_value = jerry_throw_sz (JERRY_ERROR_SYNTAX, ecma_get_error_msg (ECMA_ERR_JSON_STRINGIFY_ERROR));
  }

  ecma_string_t *ret_string_p = ecma_op_to_string (ret_value);

  ecma_free_value (ret_value);

  return ret_string_p;
  //return jerry_return (ret_value);
}

/*
warning: returning ‘jerry_value_t’ {aka ‘unsigned int’}
 from a function with return type ‘ecma_string_t *’
  makes pointer from integer without a cast [-Wint-conversion]
*/
