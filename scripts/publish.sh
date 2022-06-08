export http_proxy=http://10.158.100.3:8080
export https_proxy=http://10.158.100.3:8080
export GH_TOKEN=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
yarn run build --prod && nx run electron:make --platform windows --arch x64 --publishPolicy always