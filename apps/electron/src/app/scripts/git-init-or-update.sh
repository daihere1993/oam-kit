#!/bin/bash

git_repo=$1
dest_dir=$2

init() {
  mkdir "${dest_dir}"
  git init "${dest_dir}"
  pushd -- "${dest_dir}" > /dev/null
  git remote add origin "${git_repo}"
  popd > /dev/null
}

fetch() {
  pushd -- "${dest_dir}" > /dev/null || return 1
  git clean -fxd || return 1
  git fetch origin "refs/meta/config" || return 1
  git checkout FETCH_HEAD || return 1
  popd > /dev/null || return 1
}

main() {
  echo "start"
  if [[ -d ${dest_dir} ]]; then
    fetch
  else
    init
    fetch
  fi
}

main
