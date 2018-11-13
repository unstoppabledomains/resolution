.PHONY: help
help:
	@echo "Please select a target!"

.PHONY: format
format:
	@echo "[ $@	: \033[0;36mFormatting...\033[0m ]"
	prettier -l --write src/**/*.js

.PHONY: build
build:
	NODE_ENV=production $(MAKE) javascript

.PHONY: clean
clean:
	@echo "[ $@	: \033[0;36mCleaning...\033[0m ]"
	rm -rf build

.PHONY: javascript
javascript: clean
	@echo "[ $@	: \033[0;35mProcessing...\033[0m ]"
	./node_modules/.bin/rollup -c --silent
	@echo "[ $@	: \033[0;32mDone\033[0m ]"

.PHONY: test
test:
	@echo "[ $@	: \033[0;35mProcessing...\033[0m ]"
	sh test.sh
	@echo "[ $@	: \033[0;32mDone\033[0m ]"

.PHONY: watch
watch:
	ag -l --nocolor -G ^./src | entr -r make javascript test