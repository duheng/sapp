/**
 * sApp.Util   sApp框架的util工具集
 * build by awen ~ 71752352@qq.com ~ 2013-9-26
 */
(function(O) {
	var script_filter, sql_filter;
	/**
	 * javascript攻击检测
	 * @param  {string} str	要检测的字符串
	 * @return {boolean}     是否通过检测
	 */
	script_filter = function(str) {
		if (str) {
			str = decodeURIComponent(str);
		} else {
			return true;
		}
		var re = /(script|unescape|decodeURIComponent|decodeURI|eval|appendChild|alert|innerHTML|outerHTML|function)/gi;
		return !re.test(str);
	};
	/**
	 * sql攻击检测
	 * @param  {string} str	要检测的字符串
	 * @return {boolean}     是否通过检测
	 */
	sql_filter = function(str) {
		var re = /^\?(.*)(select%20|insert%20|delete%20from%20|count\(|drop%20table|update%20truncate%20|asc\(|mid\(|char\(|xp_cmdshell|exec%20master|net%20localgroup%20administrators|\"|:|net%20user|\|%20or%20)(.*)$/gi;
		return re.test(str);
	};

	O.script_filter = script_filter;
	O.sql_filter = sql_filter;
})(sApp.Util);