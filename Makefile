.DEFAULT_GOAL := help

.PHONY: help build serve clean

help: ## Show available commands.
	@awk 'BEGIN {FS = ":.*##"}; /^[a-zA-Z_-]+:.*##/ {printf "%-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the production site into _site/.
	bundle exec jekyll build

serve: ## Serve the site locally at http://127.0.0.1:4000.
	bundle exec jekyll serve

clean: ## Remove generated site files.
	bundle exec jekyll clean
