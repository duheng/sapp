/*
 *有限循环状态机  finite state machine
 *author	: awen
 *version: v1.0
 *email	: 71752352@qq.com
 */
(function(O) {
	O.FSM = {
		// 状态栈列表,内部元素格式为{name:fsm}
		stacks: {},
		// 版本号
		version: '1.0',
		/**
		 * 创建状态机
		 * @param  {string} name  创建的状态机的名称,将以key的形式出现在stack中
		 * @param  {json} cfg 格式如下:
		 *         {
		 *          states :['on','off'],	//状态列表
		 *          beforeChange : function(from,to,用户自传...){},	//状态变更前回调
		 *          change : function(from,to,用户自传...){}	//状态变更后回调
		 *          },
		 */
		create: function(name, cfg) {
			// 判断栈中是否已经存在该名称
			if (this.stacks.name) {
				alert('fsm:状态机名称重复:' + name);
				return false;
			}
			if (!cfg) {
				alert('fsm:请检查配置文件');
				return false;
			}
			////////////////////// 参数初始化
			cfg = cfg || {};
			var states = cfg.states || [],
				from = '',
				to = 'none',
				beforeChange = cfg.beforeChange || null,
				change = cfg.change || cfg.change,
				fsm = {};
			////////////////////// 初始化状态机
			fsm.name = name;
			// 当前状态，只能查看，设置是无效的，不影响change方法
			fsm.current = from;
			// 状态转换,有参数则转换为state，
			// 否则自动转化为下一个状态（循环）
			// 如果存在第二个以上的参数，则会传给相应的回调函数
			fsm.change = function(state) {
				var args, uargs, len = arguments.length;
				// 确认状态
				if (state) {
					to = state;
				} else {
					var idx = from ? states.indexOf(from) : 0,
						maxi = states.length - 1;
					if (idx > -1 && maxi > 0) {
						idx = idx >= maxi ? 0 : idx + 1;
						to = states[idx];
					} else {
						to = from;
					}
				}
				// 参数整合
				args = [from, to];
				// 确认用户自定义参数
				if (len > 1) {
					args = args.concat(Array.prototype.slice.call(arguments, 1));
				}
				// 状态变更前回调
				beforeChange && beforeChange.apply(this, args);
				// 变更状态
				this.current = to;
				// 状态变更后回调
				change && change.apply(this, args);
				// 重置from
				from = to;
			};
			// 加入栈中
			this.stacks[name] = fsm;
			return fsm;
		},
		/**
		 * 全局的修改状态方法
		 */
		change: function(name, state) {
			var args = Array.prototype.slice.call(arguments),
				fsm = this.stacks[name];
			args.shift();
			fsm.change.apply(fsm, args);
		}
	};
})(sApp.Plus);