#include "./cms.h"

JERRY_C_API_BEGIN

jerry_value_t cms_pp_value (const jerry_value_t value);
void cms_pp_buffer (const jerry_char_t *buffer_p, jerry_size_t buffer_size);
void cms_pp_backtrace (unsigned depth);
void cms_pp_unhandled_exception (jerry_value_t exception);
void cms_pp_unhandled_rejection (jerry_value_t exception);


jerry_value_t
cms_handler_pp (const jerry_call_info_t *call_info_p, /**< call information */
                      const jerry_value_t args_p[], /**< function arguments */
                      const jerry_length_t args_cnt); /**< number of function arguments */

jerry_value_t cms_value_to_string (const jerry_value_t value);
ecma_string_t *cms_op_to_string (ecma_value_t value);

JERRY_C_API_END

