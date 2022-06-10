export http_proxy=http://10.158.100.3:8080
export https_proxy=http://10.158.100.3:8080
export GH_TOKEN=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
yarn run build --prod && nx run electron:make --platform windows --arch x64 --publishPolicy always